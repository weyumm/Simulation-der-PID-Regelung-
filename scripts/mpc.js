class MPC {
    /**
     * 创建MPC控制器
     * @param {number} Np - 预测时域
     * @param {number} Nc - 控制时域
     * @param {number[]} Q - 状态权重矩阵对角线元素 [q1, q2] 对应位置和速度
     * @param {number} R - 控制输入权重 (标量)
     * @param {number} dt - 时间步长
     */
    constructor(Np, Nc, Q, R, dt) {
        // 基本参数验证
        if (typeof Np !== 'number' || Np <= 0 || !Number.isInteger(Np)) {
            throw new Error("Invalid prediction horizon Np. Expected positive integer.");
        }
        if (typeof Nc !== 'number' || Nc <= 0 || !Number.isInteger(Nc)) {
            throw new Error("Invalid control horizon Nc. Expected positive integer.");
        }
        if (!Array.isArray(Q) || Q.length !== 2 || typeof Q[0] !== 'number' || typeof Q[1] !== 'number') {
            throw new Error("Invalid Q matrix. Expected array of 2 numbers.");
        }
        if (typeof R !== 'number' || R <= 0) {
            throw new Error("Invalid R value. Expected positive number.");
        }
        if (typeof dt !== 'number' || dt <= 0) {
            throw new Error("Invalid dt value. Expected positive number.");
        }

        this.Np = Np; // 预测时域
        this.Nc = Nc; // 控制时域
        this.Q = Q; // 状态权重 [q1, q2]
        this.R = R; // 控制输入权重 (标量)
        this.dt = dt; // 时间步长

        // --- 修正系统模型 ---
        // 小球质量 (需要与 mpc.html 中 Matter.js 设置的 mass 一致)
        const mass = 1000;

        // 系统矩阵 (考虑质量的离散化系统)
        // x[k+1] = A*x[k] + B*u[k]
        // y[k] = C*x[k]
        this.A = [
            [1, dt],
            [0, 1]
        ];

        // 修正 B 矩阵，除以质量
        this.B = [
            [0.5 * dt * dt / mass],
            [dt / mass]
        ];
        // --------------------

        this.C = [
            [1, 0]
        ];

        // 状态变量 [位置, 速度]
        this.state = [0, 0];
    }

    /**
     * 计算控制输出
     * @param {number} ref - 参考位置
     * @param {number} position - 当前位置
     * @param {number} velocity - 当前速度
     * @returns {number} 控制输出
     */
    calc(ref, position, velocity) {
        // 更新状态
        this.state = [position, velocity];

        // 计算误差状态 (期望速度为0)
        const errorPosition = ref - position;
        const errorVelocity = 0 - velocity;
        const errorState = [errorPosition, errorVelocity];

        try {
            // 构建预测模型矩阵
            const { Phi, Gamma } = this._buildPredictionModel();

            // 构建权重矩阵
            const { Q_bar, R_bar } = this._buildWeightMatrices();

            // 构建QP问题并求解
            const u = this._solveQP(Phi, Gamma, Q_bar, R_bar, errorState);

            // 返回第一个控制输入
            return u && u.length > 0 ? u[0] : 0;
        } catch (e) {
            console.error("MPC calculation failed:", e);
            return 0; // Fail-safe
        }
    }

    /**
     * 构建预测模型矩阵Phi和Gamma
     * @returns {Object} 包含Phi和Gamma矩阵的对象
     */
    _buildPredictionModel() {
        const n = 2; // 状态维度
        const m = 1; // 控制输入维度
        const Np = this.Np;
        const Nc = this.Nc;
        const A = this.A;
        const B = this.B;

        // 使用 numeric.js 进行矩阵运算
        let A_numeric = A;
        let B_numeric = B;

        // 计算矩阵幂次A^i
        const A_pows = new Array(Np + 1);
        A_pows[0] = [[1, 0], [0, 1]]; // A^0 = I
        for (let i = 1; i <= Np; i++) {
            A_pows[i] = numeric.dot(A_pows[i - 1], A_numeric);
        }

        // 构建Phi矩阵 (Np*n x n) -> (2*Np x 2)
        // Phi = [A^1; A^2; ...; A^Np]
        let Phi = [];
        for (let i = 1; i <= Np; i++) {
            Phi = Phi.concat(A_pows[i]);
        }

        // 构建Gamma矩阵 (Np*n x Nc*m) -> (2*Np x Nc)
        // Gamma = [B, 0, ..., 0;
        //          A*B, B, ..., 0;
        //          ...
        //          A^(Np-1)*B, A^(Np-2)*B, ..., A^(Np-Nc)*B, ..., 0]
        let Gamma = numeric.rep([2 * Np, Nc], 0); // Initialize with zeros
        for (let i = 0; i < Np; i++) { // Row block i (2 rows)
            for (let j = 0; j < Nc; j++) { // Column j
                if (j <= i) {
                    // Gamma(i+1, j+1) = A^(i-j) * B
                    const pow = i - j;
                    const Ab = numeric.dot(A_pows[pow], B_numeric);
                    // Fill the 2-element column vector Ab into Gamma
                    Gamma[2 * i][j] = Ab[0][0];
                    Gamma[2 * i + 1][j] = Ab[1][0];
                }
                // else Gamma[i][j] is already 0
            }
        }

        return { Phi, Gamma };
    }

    /**
     * 构建权重矩阵Q_bar和R_bar
     * @returns {Object} 包含Q_bar和R_bar矩阵的对象
     */
    _buildWeightMatrices() {
        const Np = this.Np;
        const Nc = this.Nc;
        const Q = this.Q;
        const R = this.R;

        // 构建Q_bar对角矩阵 (Np*2 x Np*2)
        // Q_bar = diag(Q, Q, ..., Q) where Q is 2x2 diag matrix
        let Q_bar = numeric.rep([2 * Np, 2 * Np], 0);
        for (let i = 0; i < Np; i++) {
            Q_bar[2 * i][2 * i] = Q[0];
            Q_bar[2 * i + 1][2 * i + 1] = Q[1];
        }

        // 构建R_bar对角矩阵 (Nc x Nc)
        let R_bar = numeric.rep([Nc, Nc], 0);
        for (let i = 0; i < Nc; i++) {
            R_bar[i][i] = R;
        }

        return { Q_bar, R_bar };
    }

    /**
     * 求解QP问题: minimize 0.5 * u^T * H * u + f^T * u
     * subject to no constraints (simplified)
     * Solution: u = -H^-1 * f
     * @param {Array} Phi - 预测状态矩阵 (2*Np x 2)
     * @param {Array} Gamma - 控制输入矩阵 (2*Np x Nc)
     * @param {Array} Q_bar - 状态权重矩阵 (2*Np x 2*Np)
     * @param {Array} R_bar - 控制权重矩阵 (Nc x Nc)
     * @param {Array} errorState - 当前误差状态 (2 elements)
     * @returns {Array|null} 最优控制序列 (Nc elements)
     */
    _solveQP(Phi, Gamma, Q_bar, R_bar, errorState) {
        try {
            // H = Gamma^T * Q_bar * Gamma + R_bar
            const Gamma_T = numeric.transpose(Gamma);
            const H1 = numeric.dot(Gamma_T, Q_bar);
            const H = numeric.add(numeric.dot(H1, Gamma), R_bar);

            // F = Gamma^T * Q_bar * Phi
            const F = numeric.dot(numeric.dot(Gamma_T, Q_bar), Phi);

            // f = F * x (where x is the error state)
            const x = [[errorState[0]], [errorState[1]]]; // 转换为列向量
            const f_temp = numeric.dot(F, x);
            // f needs to be a vector of size Nc x 1
            const f = [];
            for (let i = 0; i < this.Nc; i++) {
                f.push(f_temp[i][0]); // Extract element from column vector
            }


            // Solve H * u = -f for u
            // Using numeric.js linear solver
            // H * u = -f => u = H \ (-f)
            const minus_f = numeric.neg(f);
            // numeric.solve needs H to be square (which it is: Nc x Nc) and f to be a vector (Nc)
            const u_vector = numeric.solve(H, minus_f); // Returns vector [u0, u1, ...]

            return u_vector;

        } catch (e) {
            console.error("Error solving QP in _solveQP:", e);
            // Return zero control inputs if solving fails
            return numeric.rep([this.Nc], 0);
        }
    }

    // --- 移除旧的、不完整的矩阵运算辅助函数 ---
    // transpose, add, subtract, multiply, inverse1x1 函数全部删除
    // 我们现在依赖 numeric.js 库来完成所有矩阵运算

    /**
     * 清除状态
     */
    clear() {
        this.state = [0, 0];
    }
}
