// scripts/teach-ddpg.js

const teachInfos = [
    {
        title: "DDPG深度确定性策略梯度原理",
        content: `DDPG (Deep Deterministic Policy Gradient) 是一种基于Actor-Critic架构的深度强化学习算法，专门用于连续动作空间控制问题。<br><br>
        <strong>核心特点：</strong><br>
        1. <strong>连续动作：</strong>直接输出连续动作值，不需要离散化<br>
        2. <strong>确定性策略：</strong>Actor网络直接输出最优动作，不是概率分布<br>
        3. <strong>Actor-Critic架构：</strong>Actor网络选择动作，Critic网络评估动作价值<br>
        4. <strong>经验回放：</strong>存储和重用经验，提高样本效率<br>
        5. <strong>目标网络：</strong>使用目标网络提高训练稳定性<br><br>
        <strong>网络结构：</strong><br>
        • <strong>Actor网络：</strong>输入状态，输出动作 (使用tanh激活限制在[-1,1])<br>
        • <strong>Critic网络：</strong>输入状态和动作，输出Q值<br>
        • <strong>目标网络：</strong>Actor和Critic都有对应的目标网络<br><br>
        <strong>训练过程：</strong><br>
        1. Actor根据当前策略选择动作，添加探索噪声<br>
        2. 执行动作，获得奖励和下一状态<br>
        3. 存储经验到回放缓冲区<br>
        4. 采样批次数据，训练Critic网络<br>
        5. 使用Critic的梯度训练Actor网络<br>
        6. 软更新目标网络参数`
    },
    {
        title: "界面操作指南",
        content: `在DDPG控制界面中，你可以体验连续动作空间的深度强化学习：<br><br>
        <strong>基本操作：</strong><br>
        • <strong>训练模式：</strong>开启训练，观察Actor和Critic网络的学习过程<br>
        • <strong>测试模式：</strong>关闭训练和噪声，测试确定性策略<br>
        • <strong>重置网络：</strong>重新初始化所有网络权重<br>
        • <strong>设置目标：</strong>点击画布设置目标位置<br><br>
        <strong>观察要点：</strong><br>
        • 注意Actor网络输出的连续力值变化<br>
        • 观察训练初期噪声对探索的影响<br>
        • 体验训练过程中控制精度的提升<br>
        • 比较DDPG与DQN在连续控制上的差异<br>
        • 观察噪声衰减过程对策略收敛的影响<br>
        • 注意目标网络软更新的效果`
    },
    {
        title: "网络结构与参数调试",
        content: `DDPG包含Actor和Critic两个网络，参数设置较为复杂：<br><br>
        <strong>Actor网络参数：</strong><br>
        • <strong>stateSize：</strong>状态向量维度<br>
        • <strong>actorLearningRate：</strong>Actor网络学习率，通常较小 (1e-4)<br>
        • <strong>网络结构：</strong>输入层→隐藏层(400单元)→隐藏层(300单元)→输出层(1单元，tanh)<br><br>
        <strong>Critic网络参数：</strong><br>
        • <strong>criticLearningRate：</strong>Critic网络学习率，通常比Actor大 (1e-3)<br>
        • <strong>网络结构：</strong>状态输入→隐藏层(400单元)，动作输入→隐藏层(300单元)，合并→隐藏层(300单元)→输出层(1单元)<br><br>
        <strong>训练参数：</strong><br>
        • <strong>gamma：</strong>折扣因子，通常0.99<br>
        • <strong>noiseSigma/noiseDecay：</strong>探索噪声参数<br>
        • <strong>replayBufferSize：</strong>经验回放缓冲区大小，100000左右<br>
        • <strong>batchSize：</strong>训练批次大小，64-128<br>
        • <strong>tau：</strong>目标网络软更新系数，0.001-0.01<br>
        • <strong>actionHigh：</strong>动作范围上限<br><br>
        <strong>调试建议：</strong><br>
        1. Actor学习率通常比Critic小一个数量级<br>
        2. 确保Critic网络能准确评估动作价值<br>
        3. 噪声参数要足够大以保证充分探索<br>
        4. 软更新系数τ要小，确保目标网络稳定<br>
        5. 批次大小和缓冲区大小要平衡`
    },
    {
        title: "探索策略与噪声设计",
        content: `在DDPG中，由于策略是确定性的，需要通过添加噪声来保证探索：<br><br>
        <strong>探索的重要性：</strong><br>
        • 确定性策略容易陷入局部最优<br>
        • 需要充分探索状态-动作空间<br>
        • 噪声设计直接影响学习效果<br><br>
        <strong>常用噪声类型：</strong><br>
        <strong>1. 高斯噪声：</strong><br>
        • 实现简单：a = a_deterministic + N(0, σ²)<br>
        • 参数：noiseSigma控制噪声强度<br>
        • 优点：实现简单，计算效率高<br>
        • 缺点：探索效率不高，噪声独立<br><br>
        <strong>2. Ornstein-Uhlenbeck (OU) 噪声：</strong><br>
        • 具有时间相关性：dx_t = θ(μ - x_t)dt + σdW_t<br>
        • 参数：θ(均值回归速度)、μ(长期均值)、σ( volatility)<br>
        • 优点：噪声具有时间相关性，更符合物理系统<br>
        • 缺点：实现复杂，需要额外参数调优<br><br>
        <strong>噪声调度策略：</strong><br>
        • <strong>线性衰减：</strong>σ = σ_initial × decay_rate^episode<br>
        • <strong>指数衰减：</strong>σ = σ_initial × exp(-decay_rate × episode)<br>
        • <strong>自适应噪声：</strong>根据学习进度动态调整<br><br>
        <strong>实践建议：</strong><br>
        1. 训练初期使用较大噪声保证充分探索<br>
        2. 随着训练进行逐渐减小噪声<br>
        3. 对于简单问题，高斯噪声足够<br>
        4. 对于复杂问题，考虑OU噪声<br>
        5. 噪声衰减要平缓，避免突然变化`
    },
    {
        title: "DDPG的改进与实际应用",
        content: `标准DDPG存在一些问题，研究者提出了多种改进算法：<br><br>
        <strong>主要问题：</strong><br>
        1. <strong>训练不稳定：</strong>Actor和Critic训练不同步<br>
        2. <strong>Q值过高估计：</strong>类似DQN的问题<br>
        3. <strong>超参数敏感：</strong>对参数设置较为敏感<br>
        4. <strong>探索效率低：</strong>确定性策略探索困难<br><br>
        <strong>改进算法：</strong><br>
        <strong>1. TD3 (Twin Delayed DDPG)：</strong><br>
        • 使用双Critic网络解决Q值过高估计<br>
        • 延迟Actor网络更新，提高稳定性<br>
        • 目标策略平滑，减少目标值方差<br>
        • 效果：显著提高训练稳定性和性能<br><br>
        <strong>2. SAC (Soft Actor-Critic)：</strong><br>
        • 基于最大熵强化学习框架<br>
        • 自动调节温度参数平衡探索和利用<br>
        • 效果：样本效率高，训练稳定<br><br>
        <strong>3. DDPG + PER：</strong><br>
        • 结合优先级经验回放<br>
        • 提高样本利用效率<br>
        • 加速学习收敛<br><br>
        <strong>实际应用建议：</strong><br>
        • <strong>机器人控制：</strong>关节控制、轨迹跟踪<br>
        • <strong>自动驾驶：</strong>转向控制、速度控制<br>
        • <strong>工业控制：</strong>温度、压力等连续过程控制<br>
        • <strong>能源管理：</strong>电池管理、电网调度<br><br>
        <strong>部署注意事项：</strong><br>
        1. 训练完成后去除噪声，使用纯确定性策略<br>
        2. 考虑计算资源限制，可能需要简化网络<br>
        3. 在实际环境中进行充分测试和验证<br>
        4. 考虑安全性和鲁棒性要求`
    }
];

// 等待teachInfos加载完成后初始化教程
function initDDPGTeach() {
    if (typeof teachInfos !== 'undefined' && teachInfos.length > 0) {
        console.log('DDPG教程已加载，共', teachInfos.length, '个步骤');
        // 这里可以添加教程初始化逻辑
    } else {
        console.error('teachInfos未定义或为空');
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDDPGTeach);
} else {
    initDDPGTeach();
}