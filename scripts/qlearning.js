// scripts/qlearning.js

class QLearningAgent {
    /**
     * 创建 Q-Learning Agent
     * @param {number} alpha - 学习率 (0, 1]
     * @param {number} gamma - 折扣因子 [0, 1)
     * @param {number} epsilon - 探索率 [0, 1]
     * @param {number} positionBuckets - 位置状态离散化的桶数
     * @param {number} velocityBuckets - 速度状态离散化的桶数
     * @param {number[]} actions - 离散的动作列表 (施加的力)
     * @param {number} screenWidth - 屏幕宽度，用于状态归一化
     */
    constructor(alpha, gamma, epsilon, positionBuckets, velocityBuckets, actions, screenWidth) {
        this.alpha = alpha;
        this.gamma = gamma;
        this.epsilon = epsilon;
        this.positionBuckets = positionBuckets;
        this.velocityBuckets = velocityBuckets;
        this.actions = actions;
        this.screenWidth = screenWidth;
        this.maxVelocity = 100; // 假设一个最大速度用于归一化

        // 初始化 Q-Table: Q[pos_bucket][vel_bucket][action_index]
        this.Q = [];
        this.initializeQTable();

        // 用于存储上一步的状态和动作，以便在下一步更新
        this.previousState = null;
        this.previousAction = null;

        this.currentEpisode = 0;
    }

    /** 初始化或重置 Q-Table */
    initializeQTable() {
        this.Q = [];
        for (let i = 0; i < this.positionBuckets; i++) {
            this.Q[i] = [];
            for (let j = 0; j < this.velocityBuckets; j++) {
                // 对于每个状态，初始化所有动作的 Q 值为 0
                this.Q[i][j] = new Array(this.actions.length).fill(0);
            }
        }
        console.log(`Q-Table initialized with pos_buckets=${this.positionBuckets}, vel_buckets=${this.velocityBuckets}, actions=${this.actions.length}`);
    }

    /**
     * 将连续状态离散化为桶索引
     * @param {number} position - 当前位置
     * @param {number} velocity - 当前速度
     * @param {number} targetPosition - 目标位置
     * @returns {Object} {posBucket, velBucket}
     */
    getState(position, velocity, targetPosition) {
        // 使用 位置误差 和 速度 作为状态
        const error = position - targetPosition;

        // 将误差归一化到 [0, 1] 或 [-1, 1]
        // 假设误差范围是 [-maxError, maxError]，例如 [-scrWidth, scrWidth]
        const maxError = this.screenWidth;
        let errorNorm = (error + maxError) / (2 * maxError); // 归一化到 [0, 1]
        errorNorm = Math.max(0, Math.min(1, errorNorm)); // Clamp to [0, 1]
        const posBucket = Math.floor(errorNorm * this.positionBuckets);
        const finalPosBucket = Math.max(0, Math.min(this.positionBuckets - 1, posBucket));

        // 将速度归一化到 [0, 1]
        let velNorm = (velocity + this.maxVelocity) / (2 * this.maxVelocity);
        velNorm = Math.max(0, Math.min(1, velNorm));
        const velBucket = Math.floor(velNorm * this.velocityBuckets);
        const finalVelBucket = Math.max(0, Math.min(this.velocityBuckets - 1, velBucket));

        return { posBucket: finalPosBucket, velBucket: finalVelBucket };
    }

    /**
     * 根据 Q-Table 和 ε-贪婪策略选择动作
     * @param {Object} state - 离散化的状态 {posBucket, velBucket}
     * @param {boolean} isTraining - 是否处于训练模式 (决定是否探索)
     * @returns {number} 动作的索引
     */
    chooseAction(state, isTraining = true) {
        if (!isTraining) {
            // 测试模式：总是选择最佳动作
             return this.getBestAction(state);
        }

        // 训练模式：ε-贪婪
        if (Math.random() < this.epsilon) {
            // 探索：随机选择一个动作
            return Math.floor(Math.random() * this.actions.length);
        } else {
            // 利用：选择当前估计最佳的动作
            return this.getBestAction(state);
        }
    }

    /**
         * 获取给定状态下 Q 值最高的动作索引
         * @param {Object} state - 离散化的状态 {posBucket, velBucket}
         * @returns {number} 最佳动作的索引
         */
        getBestAction(state) {
            const qValues = this.Q[state.posBucket][state.velBucket];
            // 找到所有 Q 值的最大值
            const maxQValue = Math.max(...qValues);
            
            // 找到所有等于最大值的动作索引
            const bestActions = [];
            for (let i = 0; i < qValues.length; i++) {
                if (qValues[i] === maxQValue) {
                    bestActions.push(i);
                }
            }
            
            // 从所有最佳动作中随机选择一个
            return bestActions[Math.floor(Math.random() * bestActions.length)];
        }

    /**
     * 根据动作索引获取实际的力值
     * @param {number} actionIndex - 动作索引
     * @returns {number} 力值
     */
    getActionValue(actionIndex) {
        return this.actions[actionIndex] || 0;
    }

    /**
     * 定义奖励函数
     * @param {number} position - 当前位置
     * @param {number} velocity - 当前速度
     * @param {number} targetPosition - 目标位置
     * @param {number} force - 当前施加的力
     * @returns {number} 奖励值
     */
    getReward(position, velocity, targetPosition, force) {
        const error = position - targetPosition;
        const absError = Math.abs(error);

        let reward = 0;

        // 1. 负的绝对位置误差 (鼓励靠近)
        reward += -absError * 0.1; // 这个惩罚是基于绝对误差的，与方向无关

        // 2. 负的速度平方 (鼓励平稳)
        reward += -Math.abs(velocity) * 0.05;

        // 3. 到达目标的奖励
        if (absError < 5) {
            reward += 100;
        }

        // 4. 大动作的惩罚 (鼓励节省能量)
        reward += -Math.abs(force) * 0.01;

        // 5. 时间惩罚 (鼓励快速完成)
        reward += -1;

        return reward;
    }

    /**
     * 执行 Q-Learning 更新
     * @param {Object} currentState - 当前离散化状态 {posBucket, velBucket}
     * @param {number} action - 当前执行的动作索引
     * @param {number} reward - 获得的即时奖励
     * @param {number} nextPosition - 下一时刻的位置
     * @param {number} nextVelocity - 下一时刻的速度
     * @param {number} targetPosition - 目标位置
     * @param {boolean} isTraining - 是否处于训练模式
     */
    update(currentState, action, reward, nextPosition, nextVelocity, targetPosition, isTraining) {
        if (!isTraining) return; // 非训练模式不更新

        // 如果没有前一步的状态和动作，则存储当前的作为第一步
        if (this.previousState === null || this.previousAction === null) {
            this.previousState = currentState;
            this.previousAction = action;
            return;
        }

        // 1. 获取下一个状态 s'
        const nextState = this.getState(nextPosition, nextVelocity, targetPosition);

        // 2. 获取 Q(s', a') 的最大值
        const nextQValues = this.Q[nextState.posBucket][nextState.velBucket];
        const maxNextQ = Math.max(...nextQValues);

        // 3. 获取 Q(s, a)
        const currentQ = this.Q[this.previousState.posBucket][this.previousState.velBucket][this.previousAction];

        // 4. 应用 Q-Learning 更新公式
        const newQ = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);

        // 5. 更新 Q-Table
        this.Q[this.previousState.posBucket][this.previousState.velBucket][this.previousAction] = newQ;

        // 6. 存储当前状态和动作，供下一步更新使用
        this.previousState = currentState;
        this.previousAction = action;
    }
}
