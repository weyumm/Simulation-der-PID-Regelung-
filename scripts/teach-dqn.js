// scripts/teach-dqn.js

const teachInfos = [
    {
        title: "深度Q网络 (DQN) 原理",
        content: `深度Q网络是将深度学习与Q-learning相结合的强化学习算法，用神经网络近似Q值函数，解决了传统Q-learning的维度灾难问题。<br><br>
        <strong>核心创新：</strong><br>
        1. <strong>函数近似：</strong>用神经网络代替Q-table存储Q值<br>
        2. <strong>经验回放：</strong>存储和随机采样经验，打破数据相关性<br>
        3. <strong>目标网络：</strong>使用单独的目标网络计算目标Q值，提高稳定性<br>
        4. <strong>连续状态处理：</strong>直接处理连续状态空间，无需离散化<br><br>
        <strong>网络结构：</strong><br>
        • 输入层：状态向量 (位置、速度等)<br>
        • 隐藏层：通常2-3个全连接层，使用ReLU激活<br>
        • 输出层：动作数量，线性激活，输出各动作的Q值<br><br>
        <strong>训练过程：</strong><br>
        1. 收集经验(s,a,r,s')存入回放缓冲区<br>
        2. 从缓冲区随机采样批次数据<br>
        3. 用目标网络计算目标Q值：target = r + γ·max Q_target(s',a')<br>
        4. 用主网络预测当前Q值，计算损失函数<br>
        5. 反向传播更新主网络参数<br>
        6. 定期更新目标网络参数`
    },
    {
        title: "界面操作指南",
        content: `在DQN控制界面中，你可以观察深度强化学习的训练过程：<br><br>
        <strong>基本操作：</strong><br>
        • <strong>训练模式：</strong>开启训练，观察神经网络的学习过程<br>
        • <strong>测试模式：</strong>关闭训练，测试学习到的策略<br>
        • <strong>重置网络：</strong>重新初始化网络权重<br>
        • <strong>设置目标：</strong>点击画布设置目标位置<br><br>
        <strong>观察要点：</strong><br>
        • 注意训练初期智能体的随机探索行为<br>
        • 观察损失函数的变化趋势<br>
        • 体验训练过程中控制性能的逐步提升<br>
        • 比较DQN与传统Q-learning的性能差异<br>
        • 观察探索率ε的衰减对学习的影响<br>
        • 注意目标网络更新的频率设置`
    },
    {
        title: "网络结构与参数调试",
        content: `DQN的网络结构和超参数设置对学习效果至关重要：<br><br>
        <strong>网络结构参数：</strong><br>
        • <strong>stateSize：</strong>状态向量维度 (位置、速度等)<br>
        • <strong>隐藏层单元数：</strong>通常64-512，影响网络表达能力<br>
        - 单元数多：表达能力强，但容易过拟合，训练慢<br>
        - 单元数少：泛化好，但可能欠拟合<br>
        • <strong>激活函数：</strong>隐藏层用ReLU，输出层用线性<br><br>
        <strong>训练参数：</strong><br>
        • <strong>learningRate：</strong>网络学习率，通常0.0001-0.001<br>
        • <strong>gamma：</strong>折扣因子，0.9-0.99<br>
        • <strong>epsilonStart/epsilonMin/epsilonDecay：</strong>探索率参数<br>
        • <strong>replayBufferSize：</strong>经验回放缓冲区大小，10000-100000<br>
        • <strong>batchSize：</strong>训练批次大小，32-256<br>
        • <strong>targetUpdateFrequency：</strong>目标网络更新频率，100-1000步<br><br>
        <strong>调试建议：</strong><br>
        1. 从简单的网络结构开始 (2个隐藏层，64-128单元)<br>
        2. 设置较小的学习率 (0.001) 防止训练不稳定<br>
        3. 确保经验回放缓冲区足够大 (至少10000)<br>
        4. 合理设置目标网络更新频率 (100-500步)<br>
        5. 逐步调整探索率衰减策略`
    },
    {
        title: "经验回放与目标网络",
        content: `经验回放和目标网络是DQN的两个关键技术，解决了训练不稳定的问题：<br><br>
        <strong>经验回放 (Experience Replay)：</strong><br>
        <strong>作用：</strong><br>
        • 打破样本间的时序相关性<br>
        • 提高数据利用效率<br>
        • 减少训练方差<br>
        • 稳定训练过程<br><br>
        <strong>实现：</strong><br>
        • 存储经验元组(s,a,r,s',done)到缓冲区<br>
        • 缓冲区满时移除最旧的经验<br>
        • 训练时随机采样批次数据<br>
        • 确保采样数据的独立同分布<br><br>
        <strong>目标网络 (Target Network)：</strong><br>
        <strong>作用：</strong><br>
        • 解决目标值频繁变化的问题<br>
        • 提供稳定的目标Q值计算<br>
        • 防止训练振荡和发散<br>
        • 提高学习稳定性<br><br>
        <strong>实现：</strong><br>
        • 维护一个与主网络结构相同的目标网络<br>
        • 用目标网络计算目标Q值：target = r + γ·max Q_target(s',a')<br>
        • 定期更新目标网络参数 (软更新或硬更新)<br>
        • 软更新：θ_target = τ·θ_main + (1-τ)·θ_target<br>
        • 硬更新：定期直接复制主网络参数到目标网络<br><br>
        <strong>参数设置建议：</strong><br>
        • 经验回放缓冲区：10000-100000<br>
        • 批次大小：32-256<br>
        • 目标网络更新频率：100-1000步<br>
        • 软更新系数τ：0.001-0.01`
    },
    {
        title: "DQN的改进与变体",
        content: `标准DQN存在一些局限性，研究者提出了多种改进算法：<br><br>
        <strong>Double DQN (DDQN)：</strong><br>
        <strong>问题：</strong>标准DQN对Q值过高估计<br>
        <strong>解决：</strong>用主网络选择动作，目标网络评估Q值<br>
        <strong>公式：</strong>target = r + γ·Q_target(s', argmax Q_main(s',a'))<br>
        <strong>效果：</strong>减少Q值过高估计，提高学习稳定性<br><br>
        <strong>Dueling DQN：</strong><br>
        <strong>思想：</strong>将Q值分解为状态价值V(s)和优势函数A(s,a)<br>
        <strong>结构：</strong>网络输出V(s)和A(s,a)，Q(s,a) = V(s) + A(s,a)<br>
        <strong>优势：</strong>提高学习效率，更好地估计状态价值<br><br>
        <strong>Prioritized Experience Replay (PER)：</strong><br>
        <strong>思想：</strong>优先采样重要的经验 (TD误差大的样本)<br>
        <strong>实现：</strong>根据TD误差分配采样概率<br>
        <strong>效果：</strong>提高学习效率，加速收敛<br><br>
        <strong>Noisy Nets：</strong><br>
        <strong>思想：</strong>在网络权重中添加噪声，代替ε-贪婪探索<br>
        <strong>优势：</strong>更高效的探索，学习过程更稳定<br><br>
        <strong>Rainbow DQN：</strong><br>
        <strong>特点：</strong>集成多种改进技术 (DDQN + Dueling + PER + Noisy Nets等)<br>
        <strong>效果：</strong>目前性能最好的DQN变体之一<br><br>
        <strong>实际应用建议：</strong><br>
        • 对于简单问题，标准DQN足够<br>
        • 对于复杂问题，考虑使用DDQN或Dueling DQN<br>
        • 如果样本效率重要，使用PER<br>
        • 需要稳定探索时，考虑Noisy Nets`
    }
];

// 等待teachInfos加载完成后初始化教程
function initDQNTeach() {
    if (typeof teachInfos !== 'undefined' && teachInfos.length > 0) {
        console.log('DQN教程已加载，共', teachInfos.length, '个步骤');
        // 这里可以添加教程初始化逻辑
    } else {
        console.error('teachInfos未定义或为空');
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDQNTeach);
} else {
    initDQNTeach();
}