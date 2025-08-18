// scripts/adaptive.js

class AdaptiveController {
    /**
     * 创建模型参考自适应控制器 (MRAC)
     * @param {number} wn - 参考模型自然频率
     * @param {number} zeta - 参考模型阻尼比
     * @param {number} m_est - 对系统质量的估计值
     * @param {number} gamma - 自适应增益
     * @param {number} sigma - σ-修改参数
     * @param {number} maxOut - 输出限幅
     * @param {number} dt - 仿真时间步长
     */
    constructor(wn, zeta, m_est, gamma, sigma, maxOut, dt) {
        this.wn = wn;
        this.zeta = zeta;
        this.m_est = m_est;
        this.gamma = gamma;
        this.sigma = sigma;
        this.maxOut = maxOut;
        this.dt = dt;

        // 参考模型状态 (位置 y_m, 速度 v_m)
        this.y_m = 0;
        this.v_m = 0;

        // 自适应参数 (这里简化为一个标量)
        this.theta_a = 0;

        // 上一步的误差和状态
        this.last_e = 0;
        this.last_y = 0;
        this.last_v = 0;
    }

    /**
     * 限制值在范围内
     * @param {number} value - 输入值
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 限制后的值
     */
    limit(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * 计算控制输出
     * @param {number} r - 参考输入 (目标位置)
     * @param {number} y - 系统输出 (当前球位置)
     * @param {number} v - 系统输出导数 (当前球速度)
     * @returns {number} 控制输出 (施加的力)
     */
    calc(r, y, v) {
        // 1. 更新参考模型 (二阶系统)
        // y_m_ddot + 2*zeta*wn*y_m_dot + wn^2*y_m = wn^2 * r
        // 使用欧拉法离散化:
        // v_m(k+1) = v_m(k) + dt * (wn^2 * (r - y_m(k)) - 2*zeta*wn*v_m(k))
        // y_m(k+1) = y_m(k) + dt * v_m(k+1)
        const v_m_dot = this.wn * this.wn * (r - this.y_m) - 2 * this.zeta * this.wn * this.v_m;
        this.v_m += v_m_dot * this.dt;
        this.y_m += this.v_m * this.dt;

        // 2. 计算跟踪误差
        const e = this.y_m - y;

        // 3. 计算名义控制 (基于估计模型)
        // 假设理想模型: y(k+1) = y(k) + v(k)*dt + (u(k)/m_est)*dt^2
        // 我们希望 y(k+1) = y_m(k+1)
        // 所以: u_nom = m_est * (y_m(k+1) - y(k) - v(k)*dt) / dt^2
        const predicted_y_nom = y + v * this.dt; // 预测名义模型下一步位置 (无控制输入)
        const u_nom = this.m_est * (this.y_m - predicted_y_nom) / (this.dt * this.dt);

        // 4. 计算自适应控制项 (简化: u_adapt = theta_a * e)
        const u_adapt = this.theta_a * e;

        // 5. 总控制输出
        let u = u_nom + u_adapt;

        // 6. 输出限幅
        u = this.limit(u, -this.maxOut, this.maxOut);

        // 7. 更新自适应参数 (σ-修改的梯度法)
        // dθ/dt = Γ * φ * e - σ * Γ * θ
        // φ = e (简化选择)
        // 禁用 sigma 修改
        // this.theta_a += this.gamma * e * e * this.dt - this.sigma * this.gamma * this.theta_a * this.dt;
        // 启用 sigma 修改
         this.theta_a += this.gamma * e * e * this.dt - this.sigma * this.gamma * this.theta_a * this.dt;
        // 或者更简单的形式，只基于误差符号 (符号函数)
        // this.theta_a += this.gamma * Math.sign(e) * Math.abs(e) * this.dt - this.sigma * this.gamma * this.theta_a * this.dt;

        // 8. 更新上一步状态
        this.last_e = e;
        this.last_y = y;
        this.last_v = v;

        return u;
    }

    /**
     * 清除内部状态
     */
    clear() {
        this.y_m = 0;
        this.v_m = 0;
        this.theta_a = 0;
        this.last_e = 0;
        this.last_y = 0;
        this.last_v = 0;
    }
}
