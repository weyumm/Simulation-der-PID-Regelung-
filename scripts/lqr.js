class LQR {
    /**
     * 创建LQR控制器
     * @param {number[]} Q - 状态权重矩阵对角线元素 [q1, q2] 对应位置和速度
     * @param {number} R - 控制输入权重 (标量)
     * @param {number} dt - 时间步长
     */
        constructor(Q, R, dt) {
        // 基本参数验证
        if (!Array.isArray(Q) || Q.length !== 2 || typeof Q[0] !== 'number' || typeof Q[1] !== 'number') {
             throw new Error("Invalid Q matrix. Expected array of 2 numbers.");
        }
        if (typeof R !== 'number' || R <= 0) {
             throw new Error("Invalid R value. Expected positive number.");
        }
        if (typeof dt !== 'number' || dt <= 0) {
             throw new Error("Invalid dt value. Expected positive number.");
        }

        this.Q = Q; // 状态权重 [q1, q2]
        this.R = R; // 控制输入权重 (标量)
        this.dt = dt; // 时间步长

        // --- 修正系统模型 ---
        // 小球质量 (需要与 lqr.html 中 Matter.js 设置的 mass 一致)
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
            [0.5 * dt * dt / mass], // <--- 关键修正
            [dt / mass]             // <--- 关键修正
        ];
        // --------------------

        this.C = [
            [1, 0]
        ];

        // 计算离散代数Riccati方程的解
        this.K = this.computeGain();

        // 状态变量 [位置, 速度]
        this.state = [0, 0];
    }

    /**
     * 计算LQR增益矩阵
     * 使用迭代方法求解离散代数Riccati方程
     */
    computeGain() {
        // 初始化P矩阵 (通常初始化为零矩阵或Q)
        let P = [
            [0, 0],
            [0, 0]
        ];
        // 创建Q和R矩阵 (对角矩阵)
        const Q_matrix = [
            [this.Q[0], 0],
            [0, this.Q[1]]
        ];

        const R_matrix = [[this.R]]; // R is a scalar, make it a 1x1 matrix

        const At = this.transpose(this.A); // A^T (2x2)
        const Bt = this.transpose(this.B); // B^T (1x2)

        const maxIterations = 1000;
        const tolerance = 1e-10; // 收敛容差
        let converged = false;

        for (let i = 0; i < maxIterations && !converged; i++) {
            // --- 计算 P_{k+1} = Q + A^T * P_k * A - K_term ---
            // 其中 K_term = A^T * P_k * B * inv(R + B^T * P_k * B) * B^T * P_k * A
            // 为了数值稳定和清晰，我们分步计算
            // 1. 计算 A^T * P_k * A
            let AP = this.multiply(At, P); // (2x2) * (2x2) = (2x2)
            if (!AP) { console.error("AP (A^T * P) is null at iteration", i); break; }
            let APA = this.multiply(AP, this.A); // (2x2) * (2x2) = (2x2)
            if (!APA) { console.error("APA (A^T * P * A) is null at iteration", i); break; }

            // 2. 计算 K_gain = inv(R + B^T * P_k * B) * B^T * P_k
            //    这是增益计算 K = K_gain * A 的一部分
            let BTP = this.multiply(Bt, P); // (1x2) * (2x2) = (1x2)
            if (!BTP) { console.error("BTP (B^T * P) is null at iteration", i); break; }
            let BTPB = this.multiply(BTP, this.B); // (1x2) * (2x1) = (1x1)
            if (!BTPB) { console.error("BTPB (B^T * P * B) is null at iteration", i); break; }
            let R_plus_BTPB = this.add(R_matrix, BTPB); // (1x1) + (1x1) = (1x1)
            if (!R_plus_BTPB) { console.error("R + BTPB is null at iteration", i); break; }
            let inv_R_plus_BTPB = this.inverse1x1(R_plus_BTPB); // (1x1)^-1 = (1x1)
            if (!inv_R_plus_BTPB) { console.error("inv(R + BTPB) is null at iteration", i); break; }
            // *** 关键修正点：计算 K_gain ***
            let K_gain = this.multiply(inv_R_plus_BTPB, BTP); // (1x1) * (1x2) = (1x2)
            if (!K_gain) { console.error("K_gain (inv * B^T * P) is null at iteration", i); break; }
            let ATP = this.multiply(At, P); // (2x2)*(2x2) = (2x2)
            let ATPB = this.multiply(ATP, this.B); // (2x2)*(2x1) = (2x1)
            if (!ATPB) { console.error("ATPB (A^T * P * B) is null at iteration", i); break; }
            // 2b. 计算 B^T * P * A (1x2)
            let BTPA = this.multiply(BTP, this.A); // (1x2)*(2x2) = (1x2) // BTP already calculated
            if (!BTPA) { console.error("BTPA (B^T * P * A) is null at iteration", i); break; }
            // 2c. 计算 inv(R + B^T * P * B) (1x1) // R_plus_BTPB, inv_R_plus_BTPB already calculated
            // 2d. 计算外积项 OuterProduct(ATPB, BTPA) -> (2x1) * (1x2) -> (2x2)
            // 我们需要实现或模拟这个外积。由于 multiply 不支持，我们手动计算。
            if (ATPB.length !== 2 || ATPB[0].length !== 1 || BTPA.length !== 1 || BTPA[0].length !== 2) {
                 console.error("Unexpected dimensions for outer product at iteration", i, ATPB, BTPA);
                 break;
            }
            const outerProduct = [
                [ATPB[0][0] * BTPA[0][0], ATPB[0][0] * BTPA[0][1]],
                [ATPB[1][0] * BTPA[0][0], ATPB[1][0] * BTPA[0][1]]
            ];
            // 2e. 计算最终的 K_term = inv_scalar * outerProduct
            const inv_scalar_value = inv_R_plus_BTPB[0][0]; // Extract scalar value
            const K_term = [
                [inv_scalar_value * outerProduct[0][0], inv_scalar_value * outerProduct[0][1]],
                [inv_scalar_value * outerProduct[1][0], inv_scalar_value * outerProduct[1][1]]
            ];

            // 3. 计算新的 P: P_new = Q + A^T P A - K_term
            let sum_Q_APA = this.add(Q_matrix, APA); // Q + A^T * P * A
            if (!sum_Q_APA) { console.error("sum_Q_APA (Q + A^T P A) is null at iteration", i); break; }
            let newP = this.subtract(sum_Q_APA, K_term); // Q + A^T P A - K_term
            if (!newP) { console.error("newP (Q + APA - K_term) is null at iteration", i); break; }

            // 4. 检查收敛性
            let diff = this.subtract(newP, P);
            if (!diff) { console.error("diff (newP - P) is null at iteration", i); break; }
            // 使用 Frobenius 范数的平方计算差异
            const norm_sq = diff[0][0] * diff[0][0] + diff[0][1] * diff[0][1] +
                            diff[1][0] * diff[1][0] + diff[1][1] * diff[1][1];
            P = newP;

            if (norm_sq < tolerance * tolerance) { // 比较平方以避免开方
                converged = true;
            }
        }

        if (!converged) {
             console.warn("LQR Riccati equation solver did not converge within " + maxIterations + " iterations.");
        }

        const final_BTP = this.multiply(Bt, P); // B^T * P -> (1x2) * (2x2) = (1x2)
        if (!final_BTP) { throw new Error("Final BTP calculation failed."); }
        const final_BTPB = this.multiply(final_BTP, this.B); // (1x2) * (2x1) = (1x1)
        if (!final_BTPB) { throw new Error("Final BTPB calculation failed."); }
        const final_R_plus_BTPB = this.add(R_matrix, final_BTPB); // (1x1) + (1x1) = (1x1)
        if (!final_R_plus_BTPB) { throw new Error("Final R + BTPB calculation failed."); }
        const final_inv_R_plus_BTPB = this.inverse1x1(final_R_plus_BTPB); // (1x1)^-1 = (1x1)
        if (!final_inv_R_plus_BTPB) { throw new Error("Final inverse calculation failed."); }
        const final_BTPA = this.multiply(final_BTP, this.A); // (1x2) * (2x2) = (1x2)
        if (!final_BTPA) { throw new Error("Final BTPA calculation failed."); }
        const K_matrix_temp = this.multiply(final_inv_R_plus_BTPB, final_BTPA); // (1x1) * (1x2)
        if (!K_matrix_temp) { throw new Error("Final K_matrix calculation failed."); }
        // K_matrix_temp 应该是 1x2 的行向量
        if (K_matrix_temp.length === 1 && K_matrix_temp[0].length === 2) {
            return K_matrix_temp[0]; // 返回增益向量 [k1, k2]
        } else {
             throw new Error("Failed to compute final LQR gain matrix K. Unexpected dimensions: " + JSON.stringify(K_matrix_temp));
        }
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

        // 计算控制输入 u = -K * x_error
        // u = - (K[0] * errorPosition + K[1] * errorVelocity)
        const u = - (this.K[0] * errorState[0] + this.K[1] * errorState[1]);

        return u;
    }

    // --- 矩阵运算辅助函数 (增强健壮性和支持) ---

    /**
     * 矩阵转置
     */
    transpose(matrix) {
        // 输入检查
        if (!Array.isArray(matrix) || matrix.length === 0 || !Array.isArray(matrix[0])) {
            console.error("Invalid matrix for transpose:", matrix);
            return null; // 更健壮的返回值
        }

        const rows = matrix.length;
        const cols = matrix[0].length;

        // 检查是否为行向量
        if (rows === 1) {
            // 行向量转置为列向量
            return matrix[0].map(val => [val]);
        }
        // 检查是否为列向量
        else if (cols === 1) {
            // 列向量转置为行向量
            return [matrix.map(row => row[0])];
        }
        // 检查是否为方阵 (2x2)
        else if (rows === 2 && cols === 2) {
             return [
                [matrix[0][0], matrix[1][0]],
                [matrix[0][1], matrix[1][1]]
            ];
        } else {
            console.error("Unsupported matrix dimensions for transpose:", rows, "x", cols);
            return null; // 更健壮的返回值
        }
    }

    /**
     * 矩阵加法
     */
    add(A, B) {
        // 输入检查
        if (!Array.isArray(A) || !Array.isArray(B) || A.length === 0 || B.length === 0 ||
            !Array.isArray(A[0]) || !Array.isArray(B[0]) ||
            A.length !== B.length || A[0].length !== B[0].length) {
            console.error("Invalid matrices for addition. A:", A, "B:", B);
            return null; // 更健壮的返回值
        }

        const rows = A.length;
        const cols = A[0].length;

        if (rows === 1 && cols === 1) {
            // 1x1 矩阵加法
            return [[A[0][0] + B[0][0]]];
        } else if (rows === 1 && cols === 2) {
            // 1x2 行向量加法
            return [[A[0][0] + B[0][0], A[0][1] + B[0][1]]];
        } else if (rows === 2 && cols === 1) {
            // 2x1 列向量加法
            return [[A[0][0] + B[0][0]], [A[1][0] + B[1][0]]];
        } else if (rows === 2 && cols === 2) {
            // 2x2 矩阵加法
            return [
                [A[0][0] + B[0][0], A[0][1] + B[0][1]],
                [A[1][0] + B[1][0], A[1][1] + B[1][1]]
            ];
        } else {
             console.error("Unsupported matrix dimensions for addition:", rows, "x", cols);
             return null; // 更健壮的返回值
        }
    }

    /**
     * 矩阵减法
     */
    subtract(A, B) {
         // 输入检查
        if (!Array.isArray(A) || !Array.isArray(B) || A.length === 0 || B.length === 0 ||
            !Array.isArray(A[0]) || !Array.isArray(B[0]) ||
            A.length !== B.length || A[0].length !== B[0].length) {
            console.error("Invalid matrices for subtraction. A:", A, "B:", B);
            return null; // 更健壮的返回值
        }

        const rows = A.length;
        const cols = A[0].length;

        if (rows === 1 && cols === 1) {
            // 1x1 矩阵减法
            return [[A[0][0] - B[0][0]]];
        } else if (rows === 1 && cols === 2) {
            // 1x2 行向量减法
            return [[A[0][0] - B[0][0], A[0][1] - B[0][1]]];
        } else if (rows === 2 && cols === 1) {
            // 2x1 列向量减法
            return [[A[0][0] - B[0][0]], [A[1][0] - B[1][0]]];
        } else if (rows === 2 && cols === 2) {
            // 2x2 矩阵减法
            return [
                [A[0][0] - B[0][0], A[0][1] - B[0][1]],
                [A[1][0] - B[1][0], A[1][1] - B[1][1]]
            ];
        } else {
             console.error("Unsupported matrix dimensions for subtraction:", rows, "x", cols);
             return null; // 更健壮的返回值
        }
    }

    /**
     * 矩阵乘法
     */
    multiply(A, B) {
        // 输入检查
        if (!Array.isArray(A) || !Array.isArray(B) || A.length === 0 || B.length === 0 ||
            !Array.isArray(A[0]) || !Array.isArray(B[0])) {
            console.error("Invalid matrices for multiplication. A:", A, "B:", B);
            return null; // 更健壮的返回值
        }

        const rowsA = A.length;
        const colsA = A[0].length;
        const rowsB = B.length;
        const colsB = B[0].length;

        if (colsA !== rowsB) {
            console.error("Matrix dimensions incompatible for multiplication. A:", rowsA, "x", colsA, "B:", rowsB, "x", colsB);
            return null; // 更健壮的返回值
        }

        // 处理具体支持的维度组合
        if (rowsA === 1 && colsA === 1 && rowsB === 1 && colsB === 1) {
            // 1x1 * 1x1 (结果是标量，包装成 1x1 矩阵)
            return [[A[0][0] * B[0][0]]];
        } else if (rowsA === 1 && colsA === 1 && rowsB === 1 && colsB === 2) {
            // ****** 新增支持: 1x1 * 1x2 ******
            return [[A[0][0] * B[0][0], A[0][0] * B[0][1]]];
        // ******************************
        } else if (rowsA === 2 && colsA === 2 && rowsB === 2 && colsB === 2) {
            // 2x2 * 2x2
            return [
                [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
                [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]
            ];
        } else if (rowsA === 2 && colsA === 2 && rowsB === 2 && colsB === 1) {
            // 2x2 * 2x1
            return [
                [A[0][0] * B[0][0] + A[0][1] * B[1][0]],
                [A[1][0] * B[0][0] + A[1][1] * B[1][0]]
            ];
        } else if (rowsA === 1 && colsA === 2 && rowsB === 2 && colsB === 2) {
            // 1x2 * 2x2
            return [[
                A[0][0] * B[0][0] + A[0][1] * B[1][0],
                A[0][0] * B[0][1] + A[0][1] * B[1][1]
            ]];
        } else if (rowsA === 1 && colsA === 2 && rowsB === 2 && colsB === 1) {
            // 1x2 * 2x1 (结果是标量，包装成 1x1 矩阵)
            return [[A[0][0] * B[0][0] + A[0][1] * B[1][0]]];
        } else if (rowsA === 2 && colsA === 1 && rowsB === 1 && colsB === 2) {
            // 2x1 * 1x2
            return [
                [A[0][0] * B[0][0], A[0][0] * B[0][1]],
                [A[1][0] * B[0][0], A[1][0] * B[0][1]]
            ];
        } else {
            console.error("Unsupported matrix multiplication dimensions. A:", rowsA, "x", colsA, "B:", rowsB, "x", colsB);
            return null; // 更健壮的返回值
        }
    }

    /**
     * 1x1矩阵求逆
     */
    inverse1x1(matrix) {
         // 输入检查
        if (!Array.isArray(matrix) || matrix.length !== 1 || !Array.isArray(matrix[0]) || matrix[0].length !== 1) {
            console.error("Invalid 1x1 matrix for inverse:", matrix);
            return null; // 更健壮的返回值
        }
        const det = matrix[0][0];
        if (Math.abs(det) < Number.EPSILON) {
            console.error("Cannot invert matrix, determinant is zero or near zero:", det);
            // 可以选择返回一个大数或零矩阵，这里返回零矩阵
            return [[0]];
            // 或者 return null; // 如果更倾向于报错
        }
        return [[1 / det]];
    }

    /**
     * 清除状态
     */
    clear() {
        this.state = [0, 0];
    }
}
