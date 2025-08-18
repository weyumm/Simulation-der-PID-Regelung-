// scripts/slidingmode.js

class SlidingModeController {
    /**
     * 创建滑模控制器
     * @param {number} lambda - 滑模面参数 lambda (> 0)
     * @param {number} K - 等效控制增益
     * @param {number} Eta - 切换控制增益 (> 0)
     * @param {number} phi - 饱和函数边界 (用于减轻抖振, > 0)
     * @param {number} m_est - 对系统质量的估计值
     * @param {number} maxOut - 输出限幅
     * @param {number} dt - 仿真时间步长
     */
    constructor(lambda, K, Eta, phi, m_est, maxOut, dt) {
        this.lambda = lambda;
        this.K = K;
        this.Eta = Eta;
        this.phi = phi; // 抖振边界
        this.m_est = m_est;
        this.maxOut = maxOut;
        this.dt = dt;

        // 内部状态
        this.s = 0; // 滑模面值
        this.e = 0; // 当前误差
        this.last_e = 0; // 上一步误差

        // 可选：存储历史用于绘图或调试
        this.history = [];
    }

    /**
     * 饱和函数 Sat(s/phi) 近似 sign(s) 以减轻抖振
     * @param {number} x - 输入值 (s/phi)
     * @returns {number} 饱和函数输出 [-1, 1]
     */
    sat(x) {
        if (x > 1) return 1;
        if (x < -1) return -1;
        return x; // 线性部分
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
     * @param {number} y_ref - 参考输入 (目标位置)
     * @param {number} y - 系统输出 (当前球位置)
     * @param {number} v - 系统输出导数 (当前球速度)
     * @returns {number} 控制输出 (施加的力)
     */
    calc(y_ref, y, v) {
        // 1. 计算误差
        this.e = y_ref - y; // 位置误差 e = y_ref - y

        // 2. 计算滑模面 s (这里使用 s = e + lambda * (-v) 的形式，假设期望速度为 0)
        //    更标准的形式是 s = e_dot + lambda * e，其中 e_dot = d(e)/dt
        //    我们近似 e_dot = (e - last_e) / dt，但这里直接用 -v 作为 e_dot 的近似
        //    或者，如果我们定义 e = y_ref - y，则 e_dot = -v (如果 y_ref_dot = 0)
        //    所以 s = e_dot + lambda * e = -v + lambda * (y_ref - y)
        this.s = -v + this.lambda * this.e;

        // 3. 计算控制律 (指数趋近律: s_dot = -K*s - Eta*sign(s) 或 -Eta*sat(s/phi))
        //    基于简化模型 v_dot = u/m，即 a = u/m
        //    s = e + lambda * (-v) = (y_ref - y) - lambda * v
        //    s_dot = -v_dot - lambda * v_dot = -v_dot - lambda * (u/m)
        //    将趋近律代入: -v_dot - lambda * (u/m) = -K*s - Eta*sat(s/phi)
        //    lambda * (u/m) = -v_dot + K*s + Eta*sat(s/phi)
        //    u = (m/lambda) * (-v_dot + K*s + Eta*sat(s/phi))
        //    但我们没有直接的 v_dot。我们用当前速度 v 和模型 v(t+1) = v(t) + (u/m)*dt
        //    来反推。这比较复杂。
        //    更直接的方法是使用控制律的形式:
        //    u = u_eq + u_sw
        //    u_eq = -m * v_dot_eq / lambda (等效控制，维持 s=0)
        //    u_sw = -Eta * sign(s) (切换控制，驱动 s->0)
        //    但是我们不知道 v_dot_eq。
        //
        //    让我们回到基于趋近律的推导，但用更直接的方式。
        //    s = e + lambda * (-v) = (r-y) - lambda*v
        //    选择控制律 u = - (m * v) / lambda + K * s - Eta * sat(s/phi)
        //    (注意：这里的 K*s 项是额外的，用于改善收敛性，不是标准的等效控制)
        //    这来自于 s_dot = -v_dot - lambda*v_dot = -v_dot - lambda*(u/m)
        //    趋近律 s_dot = -K*s - Eta*sat(s/phi)
        //    -v_dot - lambda*(u/m) = -K*s - Eta*sat(s/phi)
        //    lambda*(u/m) = -v_dot + K*s + Eta*sat(s/phi)
        //    u = (m/lambda) * (-v_dot + K*s + Eta*sat(s/phi))
        //    如果我们假设 -v_dot 可以被 K*s 项吸收或近似为 0，则得到:
        //    u = (m/lambda) * (K*s + Eta*sat(s/phi)) = (m*K/lambda)*s + (m*Eta/lambda)*sat(s/phi)
        //    但这与我们上面写的 u = ... - (m*v)/lambda ... 不符。
        //
        //    让我们使用一个更常见的 SMC 形式，直接基于状态:
        //    s = e + lambda * e_dot_appx (e.g., e + lambda * (-v))
        //    u = - (m * v) / lambda + K * s - Eta * sat(s/phi)
        //    这里的 - (m * v) / lambda 项可以看作是抵消当前速度影响的一部分。
        //    K * s 项用于拉近系统到滑模面。
        //    - Eta * sat(s/phi) 项用于鲁棒性和克服不确定性。
        //
        //    为了简化和避免 v_dot 的计算，我们采用以下形式：
        //    u = K * s - Eta * sat(s/phi)
        //    但这忽略了系统的动态。让我们用包含速度项的形式。
        //
        //    最终采用： u = - (m_est * v) / lambda + K * s - Eta * sat(s/phi)
        //    这试图抵消当前速度的影响，并施加滑模控制。

        let u = 0;

        // 等效控制项 (尝试抵消速度影响)
        const u_eq = - (this.m_est * v) / this.lambda;

        // 切换控制项 (驱动到滑模面并保持)
        const sat_s_phi = this.sat(this.s / this.phi);
        const u_sw = this.K * this.s - this.Eta * sat_s_phi;

        u = u_eq + u_sw;

        // 4. 输出限幅
        u = this.limit(u, -this.maxOut, this.maxOut);

        // 5. 更新历史状态
        this.last_e = this.e;

        // (可选) 记录历史
        // this.history.push({ s: this.s, e: this.e, u: u });

        return u;
    }

    /**
     * 清除内部状态
     */
    clear() {
        this.s = 0;
        this.e = 0;
        this.last_e = 0;
        this.history = [];
    }
}
