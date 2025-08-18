// scripts/dqn.js

class DQNAgent {
    /**
     * 创建 DQN Agent
     * @param {number} stateSize - 状态向量的维度
     * @param {number[]} actions - 离散的动作列表 (施加的力)
     * @param {number} learningRate - 学习率
     * @param {number} gamma - 折扣因子
     * @param {number} epsilonStart - 初始探索率
     * @param {number} epsilonMin - 最小探索率
     * @param {number} epsilonDecay - 探索率衰减因子
     * @param {number} replayBufferSize - 经验回放缓冲区大小
     * @param {number} batchSize - 训练批次大小
     * @param {number} targetUpdateFrequency - 目标网络更新频率 (步数)
     */
    constructor(stateSize, actions, learningRate = 0.001, gamma = 0.95,
                epsilonStart = 1.0, epsilonMin = 0.01, epsilonDecay = 0.995,
                replayBufferSize = 10000, batchSize = 32, targetUpdateFrequency = 100) {

        this.stateSize = stateSize;
        this.actions = actions;
        this.actionSize = actions.length;
        this.learningRate = learningRate;
        this.gamma = gamma;
        this.epsilonStart = epsilonStart;
        this.epsilon = epsilonStart; // Current epsilon
        this.epsilonMin = epsilonMin;
        this.epsilonDecay = epsilonDecay;
        this.replayBufferSize = replayBufferSize;
        this.batchSize = batchSize;
        this.targetUpdateFrequency = targetUpdateFrequency;
        this.learningStepCounter = 0;
        this.currentEpisode = 0;

        // 经验回放缓冲区
        this.replayBuffer = [];

        // 构建主 Q 网络和目标网络
        this.qMain = this.buildModel();
        this.qTarget = this.buildModel();
        // 初始化目标网络权重
        this.updateTargetNetwork();
    }

    /**
     * 构建 Q 网络模型
     * @returns {tf.LayersModel} TensorFlow.js 模型
     */
    buildModel() {
        const model = tf.sequential({
            layers: [
                tf.layers.dense({
                    units: 64,
                    activation: 'relu',
                    inputShape: [this.stateSize]
                }),
                tf.layers.dense({
                    units: 64,
                    activation: 'relu'
                }),
                // 输出层，节点数等于动作数，无激活函数 (线性输出)
                tf.layers.dense({
                    units: this.actionSize,
                    activation: 'linear' // Important: No activation for Q-values
                })
            ]
        });

        model.compile({
            optimizer: tf.train.adam(this.learningRate), // 使用 Adam 优化器
            loss: 'meanSquaredError', // 损失函数
            metrics: ['mae'] // 可选：监控平均绝对误差
        });

        return model;
    }

    /**
     * 将主网络的权重更新到目标网络
     */
    updateTargetNetwork() {
        const weights = this.qMain.getWeights();
        this.qTarget.setWeights(weights);
        console.log("Target network updated.");
    }

    /**
     * 根据 Q 网络和 ε-贪婪策略选择动作
     * @param {number[]} state - 当前状态向量
     * @param {boolean} isTraining - 是否处于训练模式
     * @returns {number} 动作的索引
     */
    chooseAction(state, isTraining = true) {
        if (!isTraining) {
            // 测试模式：总是选择最佳动作
            return this.getBestAction(state);
        }

        // 训练模式：ε-贪婪
        if (Math.random() <= this.epsilon) {
            // 探索：随机选择一个动作
            console.log("Exploring...");
            return Math.floor(Math.random() * this.actionSize);
        } else {
            // 利用：选择当前估计最佳的动作
            console.log("Exploiting...");
            return this.getBestAction(state);
        }
    }

    /**
     * 获取给定状态下 Q 值最高的动作索引
     * @param {number[]} state - 当前状态向量
     * @returns {number} 最佳动作的索引
     */
    getBestAction(state) {
        // 将状态转换为 Tensor 并增加一个批次维度
        // state 是 [s1, s2, ...] -> [[s1, s2, ...]]
        return tf.tidy(() => { // 使用 tidy() 管理内存
            const stateTensor = tf.tensor2d([state]); // Shape: [1, stateSize]
            const qValues = this.qMain.predict(stateTensor); // Shape: [1, actionSize]
            const action = qValues.argMax(1).dataSync()[0]; // 获取最大 Q 值对应的索引
            return action;
        });
    }

    /**
     * 存储经验到回放缓冲区
     * @param {number[]} state - 当前状态
     * @param {number} action - 执行的动作索引
     * @param {number} reward - 获得的奖励
     * @param {number[]} nextState - 下一状态
     * @param {boolean} done - 是否结束
     */
    remember(state, action, reward, nextState, done) {
        // 将经验存储为对象
        this.replayBuffer.push({
            state: state,
            action: action,
            reward: reward,
            nextState: nextState,
            done: done
        });

        // 如果缓冲区满了，则移除最旧的经验
        if (this.replayBuffer.length > this.replayBufferSize) {
            this.replayBuffer.shift();
        }
    }

    /**
     * 从经验回放中采样并训练网络
     */
    async replay() { // 使用 async 以支持 await
        // 如果缓冲区中的经验不足一个批次，则不训练
        if (this.replayBuffer.length < this.batchSize) {
            return;
        }

        // 从缓冲区中随机采样一个批次
        const samples = this.getRandomSamples(this.batchSize);

        // 提取批次数据
        const states = samples.map(s => s.state);
        const actions = samples.map(s => s.action);
        const rewards = samples.map(s => s.reward);
        const nextStates = samples.map(s => s.nextState);
        const dones = samples.map(s => s.done ? 1 : 0); // Convert boolean to number

        // --- 训练步骤 ---
        // 1. 使用目标网络计算下一个状态的 Q 值
        const nextStatesTensor = tf.tensor2d(nextStates); // Shape: [batchSize, stateSize]
        const nextQTargets = this.qTarget.predict(nextStatesTensor); // Shape: [batchSize, actionSize]
        const maxNextQs = nextQTargets.max(1); // Shape: [batchSize]

        // 2. 计算目标 Q 值: target = reward + gamma * max(Q_target(nextState, a)) (如果未结束)
        //    如果 done, target = reward
        const donesTensor = tf.tensor1d(dones); // Shape: [batchSize]
        const rewardsTensor = tf.tensor1d(rewards); // Shape: [batchSize]
        const targets = rewardsTensor.add(donesTensor.mul(-1).add(1).mul(this.gamma).mul(maxNextQs));
        // 等价于: targets = rewards + (1 - dones) * gamma * maxNextQs
        // Shape: [batchSize]

        // 3. 获取当前状态的 Q 值预测
        const statesTensor = tf.tensor2d(states); // Shape: [batchSize, stateSize]
        const currentQs = this.qMain.predict(statesTensor); // Shape: [batchSize, actionSize]

        // 4. 构造目标 Q 值 (仅更新执行的动作对应的 Q 值)
        //    其他动作的 Q 值保持不变
        const actionsTensor = tf.tensor1d(actions, 'int32'); // Shape: [batchSize]
        const targetsExpanded = targets.expandDims(1); // Shape: [batchSize, 1]
        const actionsExpanded = actionsTensor.expandDims(1); // Shape: [batchSize, 1]
        // 使用 scatterNd 更新对应动作的 Q 值
        const mask = tf.oneHot(actionsTensor, this.actionSize); // Shape: [batchSize, actionSize]
        const targetsForActions = targetsExpanded.matMul(tf.ones([1, this.actionSize])); // Shape: [batchSize, actionSize], all columns are targets
        const maskedTargets = targetsForActions.mul(mask); // Shape: [batchSize, actionSize], only action columns have targets
        const maskedCurrentQs = currentQs.mul(tf.onesLike(mask).sub(mask)); // Shape: [batchSize, actionSize], zero out action columns
        const targetQs = maskedTargets.add(maskedCurrentQs); // Shape: [batchSize, actionSize]

        // 5. 训练主网络
        const history = await this.qMain.fit(statesTensor, targetQs, {
            epochs: 1,
            verbose: 0 // 静默训练
        });

        // 6. 清理 Tensors (虽然 tidy 会处理大部分，但显式清理更安全)
        tf.dispose([
            nextStatesTensor, nextQTargets, maxNextQs, donesTensor, rewardsTensor,
            targets, statesTensor, currentQs, actionsTensor, targetsExpanded,
            actionsExpanded, mask, targetsForActions, maskedTargets,
            maskedCurrentQs, targetQs
        ]);

        // 7. 增加学习步数计数器
        this.learningStepCounter++;

        // 8. 定期更新目标网络
        if (this.learningStepCounter % this.targetUpdateFrequency === 0) {
            this.updateTargetNetwork();
        }

        console.log(`Training step ${this.learningStepCounter}, Loss: ${history.history.loss[0]}`);
    }

    /**
     * 从缓冲区中随机抽取样本
     * @param {number} numSamples - 需要的样本数
     * @returns {Array} 随机样本数组
     */
    getRandomSamples(numSamples) {
        const samples = [];
        for (let i = 0; i < numSamples; i++) {
            const idx = Math.floor(Math.random() * this.replayBuffer.length);
            samples.push(this.replayBuffer[idx]);
        }
        return samples;
    }

    /**
     * 更新探索率 epsilon
     */
    updateEpsilon() {
        if (this.epsilon > this.epsilonMin) {
            this.epsilon *= this.epsilonDecay;
        }
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
        reward += -absError * 0.1;

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
}
