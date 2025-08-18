// scripts/fuzzypid.js

class FuzzyPID {
    /**
     * 创建模糊PID控制器
     * @param {number} Kp0 - 基础比例系数
     * @param {number} Ki0 - 基础积分系数
     * @param {number} Kd0 - 基础微分系数
     * @param {number} maxInt - 积分限幅
     * @param {number} maxOut - 输出限幅
     * @param {number} Ke - 误差 e 的量化因子
     * @param {number} Kec - 误差变化率 ec 的量化因子
     * @param {number} Ku_p - dKp 的输出比例因子
     * @param {number} Ku_i - dKi 的输出比例因子
     * @param {number} Ku_d - dKd 的输出比例因子
     */
    constructor(Kp0, Ki0, Kd0, maxInt, maxOut, Ke, Kec, Ku_p, Ku_i, Ku_d) {
        // 基础 PID 参数
        this.Kp0 = Kp0;
        this.Ki0 = Ki0;
        this.Kd0 = Kd0;
        this.Kp = Kp0; // 动态调整的参数
        this.Ki = Ki0;
        this.Kd = Kd0;
        this.maxInt = maxInt;
        this.maxOut = maxOut;

        // 模糊控制参数
        this.Ke = Ke;   // 误差量化因子 (用于模糊化)
        this.Kec = Kec; // 误差变化率量化因子 (用于模糊化)
        this.Ku_p = Ku_p; // dKp 输出因子 (用于去模糊化)
        this.Ku_i = Ku_i; // dKi 输出因子
        this.Ku_d = Ku_d; // dKd 输出因子

        // PID 内部状态
        this.error = 0;
        this.lastError = 0;
        this.integral = 0;
        this.output = 0;

        // 定义模糊集标签 (语言变量)
        this.labels = ['NB', 'NM', 'NS', 'ZO', 'PS', 'PM', 'PB']; // Negative Big, Medium, Small; Zero; Positive Small, Medium, Big

        // 定义模糊规则库
        // 规则形式: IF e is E_label AND ec is EC_label THEN dKp is DKP_label, dKi is DKI_label, dKd is DKD_label
        // 规则索引: this.rules[E_label_index][EC_label_index] = [DKP_label, DKI_label, DKD_label]
        // 使用二维数组，7 (e_labels) x 7 (ec_labels)
        this.rules = [
            // ec: NB     NM     NS     ZO     PS     PM     PB
            // e: NB
            [
                ['PB', 'NB', 'NB'], ['PB', 'NB', 'NM'], ['PM', 'NM', 'NM'], ['PM', 'NM', 'NS'],
                ['PS', 'NS', 'NS'], ['PS', 'NS', 'ZO'], ['ZO', 'ZO', 'ZO']
            ],
            // e: NM
            [
                ['PB', 'NB', 'NM'], ['PB', 'NB', 'NM'], ['PM', 'NM', 'NS'], ['PS', 'NS', 'NS'],
                ['PS', 'NS', 'ZO'], ['ZO', 'ZO', 'PS'], ['NS', 'ZO', 'PS']
            ],
            // e: NS
            [
                ['PM', 'NB', 'NM'], ['PM', 'NM', 'NS'], ['PM', 'NS', 'NS'], ['PS', 'NS', 'ZO'],
                ['ZO', 'ZO', 'PS'], ['NS', 'PS', 'PM'], ['NM', 'PM', 'PM']
            ],
            // e: ZO
            [
                ['PM', 'NM', 'NS'], ['PM', 'NS', 'NS'], ['PS', 'NS', 'ZO'], ['ZO', 'ZO', 'PS'],
                ['NS', 'PS', 'PM'], ['NM', 'PM', 'PM'], ['NM', 'PM', 'PB']
            ],
            // e: PS
            [
                ['PS', 'NS', 'NS'], ['PS', 'NS', 'ZO'], ['ZO', 'ZO', 'PS'], ['NS', 'PS', 'PM'],
                ['NM', 'PM', 'PM'], ['NM', 'PM', 'PB'], ['NB', 'PB', 'PB']
            ],
            // e: PM
            [
                ['PS', 'NS', 'ZO'], ['ZO', 'ZO', 'PS'], ['NS', 'PS', 'PM'], ['NM', 'PM', 'PM'],
                ['NM', 'PM', 'PB'], ['NB', 'PB', 'PB'], ['NB', 'PB', 'PB']
            ],
            // e: PB
            [
                ['ZO', 'ZO', 'PS'], ['NS', 'PS', 'PM'], ['NM', 'PM', 'PM'], ['NM', 'PM', 'PB'],
                ['NB', 'PB', 'PB'], ['NB', 'PB', 'PB'], ['NB', 'PB', 'PB']
            ]
        ];
        // 注意：这个规则库是另一个常见的简化版本，可能需要根据实际效果调整。
        // 例如，规则 [ZO][ZO] = [ZO, ZO, PS] 表示当误差和误差变化率都接近零时，
        // dKp 不变，dKi 不变，dKd 增加一点（增加阻尼）。
    }

    /**
     * 三角隶属度函数
     * @param {number} x - 输入值
     * @param {number} a - 左边界
     * @param {number} b - 中心点
     * @param {number} c - 右边界
     * @returns {number} 隶属度 [0, 1]
     */
    trimf(x, a, b, c) {
        if (x <= a || x >= c) return 0;
        if (x >= a && x <= b) return (x - a) / (b - a);
        if (x >= b && x <= c) return (c - x) / (c - b);
        return 0; // Should not reach here if a <= b <= c
    }

    /**
     * 模糊化过程：计算输入值对各模糊集的隶属度
     * @param {number} x - 输入值 (e 或 ec)
     * @param {number} factor - 量化因子 (Ke 或 Kec)
     * @returns {number[]} 隶属度数组，对应 labels 顺序
     */
    fuzzify(x, factor) {
        const xe = x * factor; // 量化
        // 定义论域范围，这里假设为 [-6, 6]，可以根据需要调整
        const domain = 6;
        // 定义每个模糊集的三角形参数 [a, b, c]
        // 假设7个模糊集均匀分布在 [-domain, domain]
        const fuzzySets = [
            [-domain, -domain, -domain/2], // NB
            [-domain, -domain/2, 0],       // NM
            [-domain/2, 0, domain/2],      // NS
            [-domain/2, 0, domain/2],      // ZO (与NS相同范围，中心在0)
            [-domain/2, 0, domain/2],      // PS (与NS相同范围，中心在0)
            [0, domain/2, domain],         // PM
            [domain/2, domain, domain]     // PB
        ];

        // 修正 ZO, PS, NS 的参数以避免完全重叠
        fuzzySets[2] = [-domain, -domain/3, 0]; // NS
        fuzzySets[3] = [-domain/3, 0, domain/3]; // ZO
        fuzzySets[4] = [0, domain/3, domain];    // PS

        const memberships = [];
        for (let i = 0; i < this.labels.length; i++) {
            memberships.push(this.trimf(xe, ...fuzzySets[i]));
        }
        return memberships;
    }

    /**
     * 去模糊化过程：使用重心法 (Center of Gravity) 将模糊输出转换为精确值
     * @param {number[]} outputMemberships - 输出模糊集的激活强度
     * @param {number} factor - 输出因子 (Ku_p, Ku_i, Ku_d)
     * @returns {number} 去模糊化后的精确值
     */
    defuzzify(outputMemberships, factor) {
        // 定义输出论域范围，例如 [-3, 3]，可以根据需要调整
        const domain = 3;
        // 定义输出模糊集的中心点 (用于重心法计算)
        const centers = [
            -domain, -domain*2/3, -domain/3, 0, domain/3, domain*2/3, domain
        ]; // 对应 NB, NM, NS, ZO, PS, PM, PB

        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < this.labels.length; i++) {
            const miu = outputMemberships[i];
            if (miu > 0) { // 只考虑激活的规则
                numerator += miu * centers[i];
                denominator += miu;
            }
        }

        if (denominator === 0) {
            return 0; // 如果没有规则被激活，输出0
        }

        const cog = numerator / denominator; // 重心位置
        return cog * factor; // 乘以输出因子得到最终调整量
    }

    /**
     * 根据模糊规则进行推理
     * @param {number[]} eMemberships - 误差 e 的隶属度
     * @param {number[]} ecMemberships - 误差变化率 ec 的隶属度
     * @returns {Object} 包含 dKp, dKi, dKd 隶属度的对象
     */
    infer(eMemberships, ecMemberships) {
        // 初始化输出隶属度数组
        const dKpMemberships = new Array(this.labels.length).fill(0);
        const dKiMemberships = new Array(this.labels.length).fill(0);
        const dKdMemberships = new Array(this.labels.length).fill(0);

        // 遍历所有规则
        for (let i = 0; i < this.labels.length; i++) { // e 的标签索引
            for (let j = 0; j < this.labels.length; j++) { // ec 的标签索引
                const rule = this.rules[i][j];
                const dKp_label = rule[0];
                const dKi_label = rule[1];
                const dKd_label = rule[2];

                // 计算前提的满足度 (取小运算)
                const firingStrength = Math.min(eMemberships[i], ecMemberships[j]);

                if (firingStrength > 0) {
                    // 根据规则结论更新输出隶属度 (取大运算)
                    const dKp_index = this.labels.indexOf(dKp_label);
                    const dKi_index = this.labels.indexOf(dKi_label);
                    const dKd_index = this.labels.indexOf(dKd_label);

                    if (dKp_index !== -1) {
                        dKpMemberships[dKp_index] = Math.max(dKpMemberships[dKp_index], firingStrength);
                    }
                    if (dKi_index !== -1) {
                        dKiMemberships[dKi_index] = Math.max(dKiMemberships[dKi_index], firingStrength);
                    }
                    if (dKd_index !== -1) {
                        dKdMemberships[dKd_index] = Math.max(dKdMemberships[dKd_index], firingStrength);
                    }
                }
            }
        }

        return {
            dKpMemberships: dKpMemberships,
            dKiMemberships: dKiMemberships,
            dKdMemberships: dKdMemberships
        };
    }

    /**
     * 计算控制输出
     * @param {number} ref - 参考位置 (目标位置)
     * @param {number} fdb - 反馈位置 (当前球位置)
     * @returns {number} 控制输出 (施加的力)
     */
    calc(ref, fdb) {
        this.lastError = this.error;
        this.error = ref - fdb;
        const ec = this.error - this.lastError; // 误差变化率

        // 1. 模糊化
        const eMemberships = this.fuzzify(this.error, this.Ke);
        const ecMemberships = this.fuzzify(ec, this.Kec);

        // 2. 模糊推理
        const { dKpMemberships, dKiMemberships, dKdMemberships } = this.infer(eMemberships, ecMemberships);

        // 3. 去模糊化
        const dKp = this.defuzzify(dKpMemberships, this.Ku_p);
        const dKi = this.defuzzify(dKiMemberships, this.Ku_i);
        const dKd = this.defuzzify(dKdMemberships, this.Ku_d);

        // 4. 更新实际 PID 参数
        this.Kp = this.Kp0 + dKp;
        this.Ki = this.Ki0 + dKi;
        this.Kd = this.Kd0 + dKd;

        // 5. 执行标准 PID 计算
        const pErr = this.error * this.Kp;
        const dErr = (this.error - this.lastError) * this.Kd; // 或者直接使用 ec * Kd
        this.integral += this.Ki * this.error;
        this.integral = Math.max(-this.maxInt, Math.min(this.maxInt, this.integral)); // 积分限幅
        const sumErr = pErr + dErr + this.integral;
        this.output = Math.max(-this.maxOut, Math.min(this.maxOut, sumErr)); // 输出限幅

        return this.output;
    }

    /**
     * 清除内部状态
     */
    clear() {
        this.error = 0;
        this.lastError = 0;
        this.integral = 0;
        this.output = 0;
        // 重置动态参数为初始值
        this.Kp = this.Kp0;
        this.Ki = this.Ki0;
        this.Kd = this.Kd0;
    }
}
