class FuzzyPID {
    constructor() {
        this.kp = 0;
        this.ki = 0;
        this.kd = 0;
        this.maxOut = 50;
        // 模糊控制参数
        this.quantFactor = 1;   // 量化因子
        this.scaleFactor = 1;   // 比例因子
        this.error = 0;
        this.lastError = 0;
    }

    calc(target, current) {
        const e = target - current;
        const delta_e = e - this.lastError;
        
        // 模糊化处理（示例规则）
        const e_fuzzy = this.fuzzify(e * this.quantFactor);
        const delta_e_fuzzy = this.fuzzify(delta_e * this.quantFactor);
        
        // 模糊规则调整PID参数（示例规则）
        this.kp += e_fuzzy * this.scaleFactor;
        this.ki += delta_e_fuzzy * this.scaleFactor;
        this.kd += (e_fuzzy + delta_e_fuzzy) * this.scaleFactor;
        
        // 常规PID计算
        const p = this.kp * e;
        const i = this.ki * e;
        const d = this.kd * delta_e;
        
        this.lastError = e;
        return Math.max(-this.maxOut, Math.min(p + i + d, this.maxOut));
    }

    fuzzify(value) {
        // 简单三角隶属函数
        return Math.max(-1, Math.min(value, 1));
    }
}