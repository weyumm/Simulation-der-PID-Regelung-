// scripts/ddpg.js

class DDPGAgent {
    /**
     * 创建 DDPG Agent
     * @param {number} stateSize - 状态向量的维度
     * @param {number} actorLearningRate - Actor 网络学习率
     * @param {number} criticLearningRate - Critic 网络学习率
     * @param {number} gamma - 折扣因子
     * @param {number} noiseSigma - Ornstein-Uhlenbeck 噪声初始标准差 (或高斯噪声标准差)
     * @param {number} noiseDecay - 噪声衰减率
     * @param {number} replayBufferSize - 经验回放缓冲区大小
     * @param {number} batchSize - 训练批次大小
     * @param {number} tau - 目标网络软更新系数 (0 < tau << 1)
     * @param {number} actionHigh - 动作空间的上限 (假设对称于0)
     */
    constructor(stateSize, actorLearningRate = 1e-4, criticLearningRate = 1e-3, gamma = 0.99,
                noiseSigma = 0.2, noiseDecay = 0.9995,
                replayBufferSize = 100000, batchSize = 64, tau = 0.001, actionHigh = 10.0) {

        this.stateSize = stateSize;
        this.actionSize = 1; // 连续动作空间，维度为1 (力的大小)
        this.actorLearningRate = actorLearningRate;
        this.criticLearningRate = criticLearningRate;
        this.gamma = gamma;
        this.initialNoiseSigma = noiseSigma;
        this.noiseSigma = noiseSigma; // Current noise sigma
        this.noiseDecay = noiseDecay;
        this.replayBufferSize = replayBufferSize;
        this.batchSize = batchSize;
        this.tau = tau; // 软更新系数
        this.actionHigh = actionHigh; // 动作范围 [-actionHigh, actionHigh]
        this.currentEpisode = 0;

        // 经验回放缓冲区
        this.replayBuffer = [];

        // 构建网络
        this.actorMain = this.buildActorModel();
        this.actorTarget = this.buildActorModel();
        this.criticMain = this.buildCriticModel();
        this.criticTarget = this.buildCriticModel();

        // 初始化目标网络权重
        this.updateTargetNetworks(1.0); // 第一次用硬更新

        // 用于探索的噪声过程 (这里使用简单的高斯噪声)
        // 更高级的可以用 Ornstein-Uhlenbeck 过程来生成 temporally correlated noise
        this.noiseProcess = null; // 可以初始化 OU 过程，这里简化
    }

    /**
     * 构建 Actor 网络模型 (策略网络: 输入状态, 输出动作)
     * @returns {tf.LayersModel}
     */
    buildActorModel() {
        const model = tf.sequential({
            layers: [
                tf.layers.dense({
                    units: 400,
                    activation: 'relu',
                    inputShape: [this.stateSize]
                }),
                tf.layers.dense({
                    units: 300,
                    activation: 'relu'
                }),
                // 输出层，节点数等于动作数，使用 tanh 激活函数将输出限制在 [-1, 1]
                tf.layers.dense({
                    units: this.actionSize,
                    activation: 'tanh' // 输出范围 [-1, 1]
                }),
            ]
        });

        model.compile({
            optimizer: tf.train.adam(this.actorLearningRate),
            loss: () => { throw new Error('Actor loss is computed manually during training'); } // Actor loss 在 Critic 训练时计算
        });

        return model;
    }

    /**
     * 构建 Critic 网络模型 (价值网络: 输入状态和动作, 输出 Q 值)
     * @returns {tf.LayersModel}
     */
    buildCriticModel() {
        // Critic 有两个输入：状态和动作
        const stateInput = tf.input({shape: [this.stateSize], name: 'state_input'});
        const actionInput = tf.input({shape: [this.actionSize], name: 'action_input'});

        // 处理状态输入
        const stateHidden1 = tf.layers.dense({units: 400, activation: 'relu'}).apply(stateInput);
        // const stateHidden2 = tf.layers.dense({units: 300, activation: 'relu'}).apply(stateHidden1); // 可以加更多层

        // 处理动作输入
        const actionHidden = tf.layers.dense({units: 300, activation: 'relu'}).apply(actionInput);

        // 合并状态和动作的表示
        // 方法1: 在某个隐藏层合并 (常见做法)
        // 这里简化：将状态隐藏层和动作隐藏层直接相加 (需要维度匹配，或通过 Dense 调整)
        // 为了简单，我们让 stateHidden1 (400 units) 和 actionHidden (300 units) 分别处理，然后在 Critic 的下一层合并
        // 更标准的做法是将 stateHidden1 也变成 300 units，然后与 actionHidden 相加，再输入到下一个 Dense 层
        // 我们采用一个更直接的合并方式：拼接
        const merged = tf.layers.concatenate().apply([stateHidden1, actionHidden]); // Shape: [batch, 400+300]

        const mergedHidden = tf.layers.dense({units: 300, activation: 'relu'}).apply(merged);
        const qOutput = tf.layers.dense({units: 1, activation: 'linear', name: 'q_value'}).apply(mergedHidden); // 输出 Q 值

        const model = tf.model({inputs: [stateInput, actionInput], outputs: qOutput});

        model.compile({
            optimizer: tf.train.adam(this.criticLearningRate),
            loss: 'meanSquaredError'
        });

        return model;
    }

    /**
     * 将主网络的权重软更新到目标网络
     * θ_target = τ * θ_main + (1 - τ) * θ_target
     * @param {number} tau - 更新系数 (如果为1.0，则为硬更新)
     */
    updateTargetNetworks(tau = this.tau) {
        // 更新 Actor
        const actorMainWeights = this.actorMain.getWeights();
        const actorTargetWeights = this.actorTarget.getWeights();
        const updatedActorWeights = [];
        for (let i = 0; i < actorMainWeights.length; i++) {
            updatedActorWeights.push(
                tf.add(tf.mul(actorMainWeights[i], tau), tf.mul(actorTargetWeights[i], 1 - tau))
            );
        }
        this.actorTarget.setWeights(updatedActorWeights);

        // 更新 Critic
        const criticMainWeights = this.criticMain.getWeights();
        const criticTargetWeights = this.criticTarget.getWeights();
        const updatedCriticWeights = [];
        for (let i = 0; i < criticMainWeights.length; i++) {
            updatedCriticWeights.push(
                tf.add(tf.mul(criticMainWeights[i], tau), tf.mul(criticTargetWeights[i], 1 - tau))
            );
        }
        this.criticTarget.setWeights(updatedCriticWeights);

        if (tau === 1.0) {
            console.log("Target networks initialized/hard updated.");
        } else {
            console.log("Target networks soft updated.");
        }
    }


    /**
     * 根据 Actor 网络和噪声选择动作
     * @param {number[]} state - 当前状态向量
     * @param {boolean} isTraining - 是否处于训练模式
     * @returns {number} 动作值 (力的大小)
     */
    chooseAction(state, isTraining = true) {
        // 使用 tf.tidy() 来管理内存，确保临时张量被清理
        return tf.tidy(() => {
            const stateTensor = tf.tensor2d([state]); // Shape: [1, stateSize]

            // 1. 通过主 Actor 网络获取原始动作输出 (范围 [-1, 1])
            const rawActionTensor = this.actorMain.predict(stateTensor); // Shape: [1, actionSize=1]
            // rawActionTensor.print(); // 可用于调试，查看原始输出

            // 2. 手动将原始动作缩放到实际动作范围 [-actionHigh, actionHigh]
            // 使用 tf.mul 进行张量乘法
            const scaledActionTensor = tf.mul(rawActionTensor, this.actionHigh);

            // 3. 将张量转换为 JavaScript 数值
            let actionValue = scaledActionTensor.dataSync()[0]; // 获取标量值

            // 4. (可选) 添加噪声进行探索 (训练模式下)
            if (isTraining && this.noiseSigma > 0) {
                // 使用高斯噪声
                const noise = tf.randomNormal([1], 0, this.noiseSigma).dataSync()[0];
                // const noise = this.sampleOUNoise(); // 如果实现了 OU 噪声
                actionValue += noise;
                console.log(`Action: ${actionValue - noise}, Noise: ${noise}, Noisy Action: ${actionValue}`);
            }

            // 5. 确保动作在合法范围内 (重要!)
            actionValue = Math.max(-this.actionHigh, Math.min(this.actionHigh, actionValue));

            return actionValue;
        }); // tf.tidy() 结束，自动清理在此作用域内创建的张量
    }

    // 简化的高斯噪声采样 (可替换为 OU 过程)
    // sampleOUNoise() { /* ... */ }

    /**
     * 存储经验到回放缓冲区
     * @param {number[]} state - 当前状态
     * @param {number} action - 执行的动作值
     * @param {number} reward - 获得的奖励
     * @param {number[]} nextState - 下一状态
     * @param {boolean} done - 是否结束
     */
    remember(state, action, reward, nextState, done) {
        this.replayBuffer.push({
            state: state,
            action: action,
            reward: reward,
            nextState: nextState,
            done: done
        });

        if (this.replayBuffer.length > this.replayBufferSize) {
            this.replayBuffer.shift();
        }
    }

    /**
     * 从经验回放中采样并训练网络
     */
    async train() {
        if (this.replayBuffer.length < this.batchSize) {
            return;
        }

        const samples = this.getRandomSamples(this.batchSize);

        const states = tf.tensor2d(samples.map(s => s.state));
        const actions = tf.tensor2d(samples.map(s => [s.action])); // Shape: [batchSize, 1]
        const rewards = tf.tensor1d(samples.map(s => s.reward));
        const nextStates = tf.tensor2d(samples.map(s => s.nextState));
        const dones = tf.tensor1d(samples.map(s => s.done ? 1 : 0));

        // --- Critic 训练 ---
        // 1. 使用目标 Actor 网络获取下一个状态的动作
        //    并将其缩放到 [-actionHigh, actionHigh]
        const nextActionsUnscaled = this.actorTarget.predict(nextStates); // Shape: [batchSize, 1]
        const nextActions = tf.mul(nextActionsUnscaled, this.actionHigh);

        // 2. 使用目标 Critic 网络计算下一个状态-动作对的 Q 值
        const nextQTargets = this.criticTarget.predict([nextStates, nextActions]); // Shape: [batchSize, 1]
        const nextQValues = nextQTargets.squeeze([1]); // Shape: [batchSize]

        // 3. 计算目标 Q 值: y = r + γ * (1-done) * Q_target(s', a')
        const y = rewards.add(tf.mul(tf.sub(1, dones), tf.mul(this.gamma, nextQValues))); // Shape: [batchSize]

        // 4. 训练 Critic 网络 (最小化 MSE: (y - Q_main(s,a))^2)
        //    需要自定义训练循环来获取梯度
        tf.grads(() => {
             const qValuesMain = this.criticMain.predict([states, actions]).squeeze([1]); // Shape: [batchSize]
             const criticLoss = tf.losses.meanSquaredError(y, qValuesMain);
             return criticLoss;
        })(this.criticMain.getWeights());

        // --- Actor 训练 ---
        // 1. 使用主 Actor 网络计算当前状态的动作 (用于梯度计算)
        const actionsMainUnscaled = this.actorMain.predict(states); // Shape: [batchSize, 1]
        const actionsMain = tf.mul(actionsMainUnscaled, this.actionHigh);

        // 2. 使用主 Critic 网络计算 Q 值
        const qValuesMainActor = this.criticMain.predict([states, actionsMain]); // Shape: [batchSize, 1]

        // 3. Actor 的损失是 -Q 值的平均 (因为我们想最大化 Q 值)
        //    需要自定义训练循环
        tf.grads(() => {
             const actorLoss = tf.neg(tf.mean(qValuesMainActor)); // 负号因为是梯度上升
             return actorLoss;
        })(this.actorMain.getWeights());

        // --- 更新目标网络 ---
        this.updateTargetNetworks(this.tau);

        // 清理 Tensors
        tf.dispose([
            states, actions, rewards, nextStates, dones,
            nextActionsUnscaled, nextActions, nextQTargets, nextQValues,
            y, actionsMainUnscaled, actionsMain, qValuesMainActor
            // grads 产生的梯度张量通常由 tf.grads 自动处理
        ]);

        console.log("DDPG training step completed.");
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
     * 更新探索噪声
     */
    updateNoise() {
        this.noiseSigma *= this.noiseDecay;
        // 可以设置一个最小噪声值
        // this.noiseSigma = Math.max(this.noiseSigma, 0.01);
    }

    /**
     * 定义奖励函数 (与 DQN 相同)
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
