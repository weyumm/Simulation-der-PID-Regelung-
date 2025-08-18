// scripts/teach-qlearning.js

const teachInfos = [
    {
        title: "Q-learning强化学习原理",
        content: `Q-learning是一种无模型的强化学习算法，通过智能体与环境的交互学习最优策略，无需预先知道环境模型。<br><br>
        <strong>核心概念：</strong><br>
        1. <strong>状态(State)：</strong>系统当前的情况描述<br>
        2. <strong>动作(Action)：</strong>智能体可以执行的操作<br>
        3. <strong>奖励(Reward)：</strong>环境对动作的反馈信号<br>
        4. <strong>Q值：</strong>状态-动作对的价值函数<br>
        5. <strong>策略(Policy)：</strong>选择动作的规则<br><br>
        <strong>学习原理：</strong><br>
        • Q-table：存储所有状态-动作对的Q值<br>
        • 更新公式：Q(s,a) ← Q(s,a) + α[r + γ·max Q(s',a') - Q(s,a)]<br>
        • α：学习率，控制学习速度<br>
        • γ：折扣因子，平衡即时奖励和未来奖励<br>
        • ε-贪婪策略：平衡探索和利用`
    },
    {
        title: "界面操作指南",
        content: `在Q-learning控制界面中，你可以观察智能体的学习过程：<br><br>
        <strong>基本操作：</strong><br>
        • <strong>训练模式：</strong>开启训练让智能体学习最优策略<br>
        • <strong>测试模式：</strong>关闭训练，测试学习到的策略性能<br>
        • <strong>重置学习：</strong>清空Q-table重新开始学习<br>
        • <strong>设置目标：</strong>点击画布设置目标位置<br><br>
        <strong>观察要点：</strong><br>
        • 注意智能体初期的随机探索行为<br>
        • 观察Q值随训练次数的增加而收敛<br>
        • 体验训练前后控制性能的巨大差异<br>
        • 注意奖励函数对学习效果的影响<br>
        • 观察探索率ε的衰减过程`
    },
    {
        title: "参数调试指南",
        content: `Q-learning算法的参数设置对学习效果和收敛速度有重要影响：<br><br>
        <strong>学习参数：</strong><br>
        • <strong>α (学习率)：</strong>控制Q值更新的步长<br>
        - 值范围：(0, 1]<br>
        - 值大：学习快，但可能不稳定<br>
        - 值小：学习稳定，但收敛慢<br>
        - 推荐：0.1-0.5<br><br>
        • <strong>γ (折扣因子)：</strong>平衡即时奖励和未来奖励<br>
        - 值范围：[0, 1)<br>
        - 值接近1：重视长期奖励<br>
        - 值接近0：重视即时奖励<br>
        - 推荐：0.9-0.99<br><br>
        • <strong>ε (探索率)：</strong>控制探索和利用的平衡<br>
        - 值范围：[0, 1]<br>
        - 值大：探索多，学习全面但效率低<br>
        - 值小：利用多，收敛快但可能陷入局部最优<br>
        - 推荐：初始0.9-1.0，逐渐衰减到0.01-0.1<br><br>
        <strong>状态离散化参数：</strong><br>
        • <strong>positionBuckets：</strong>位置状态离散化的桶数<br>
        • <strong>velocityBuckets：</strong>速度状态离散化的桶数<br>
        - 桶数多：状态空间大，学习精度高但速度慢<br>
        - 桶数少：状态空间小，学习快但精度低<br><br>
        <strong>动作空间参数：</strong><br>
        • <strong>actions：</strong>离散动作列表(力值)<br>
        - 动作多：控制精度高，但学习复杂<br>
        - 动作少：学习简单，但控制精度低`
    },
    {
        title: "奖励函数设计",
        content: `奖励函数是Q-learning的核心，好的奖励函数设计能显著提升学习效果：<br><br>
        <strong>奖励函数设计原则：</strong><br>
        1. <strong>目标导向：</strong>奖励应该引导智能体达成控制目标<br>
        2. <strong>稀疏性平衡：</strong>避免过于稀疏的奖励信号<br>
        3. <strong>多目标平衡：</strong>平衡精度、速度、能耗等多个目标<br>
        4. <strong>可学习性：</strong>奖励信号应该便于智能体理解<br><br>
        <strong>典型奖励项：</strong><br>
        • <strong>位置误差惩罚：</strong>-|position - target| × weight<br>
        • <strong>速度惩罚：</strong>-|velocity| × weight (鼓励平稳)<br>
        • <strong>到达目标奖励：</strong>+large_bonus (当误差很小时)<br>
        • <strong>控制能耗惩罚：</strong>-|force| × weight (节能)<br>
        • <strong>时间惩罚：</strong>-small_penalty (鼓励快速)<br><br>
        <strong>设计建议：</strong><br>
        1. 先设计简单的奖励函数，确保基本功能<br>
        2. 逐步添加复杂的奖励项，优化性能<br>
        3. 通过实验调整各项权重，平衡不同目标<br>
        4. 避免奖励冲突，确保奖励信号的一致性<br><br>
        <strong>示例奖励函数：</strong><br>
        reward = -0.1×|error| - 0.05×|velocity| + 100×(到达目标) - 0.01×|force| - 1`
    },
    {
        title: "Q-learning的优缺点与改进",
        content: `Q-learning作为经典的强化学习算法，有其独特的优势和局限性：<br><br>
        <strong>主要优势：</strong><br>
        1. <strong>无模型：</strong>不需要环境模型，通过试错学习<br>
        2. <strong>离策略：</strong>学习最优策略的同时可以执行其他策略<br>
        3. <strong>收敛保证：</strong>在适当条件下保证收敛到最优Q值<br>
        4. <strong>实现简单：</strong>算法原理清晰，易于实现<br>
        5. <strong>适用性广：</strong>适用于各种序贯决策问题<br><br>
        <strong>主要局限：</strong><br>
        1. <strong>维度灾难：</strong>状态空间大时Q-table存储和计算困难<br>
        2. <strong>收敛速度慢：</strong>需要大量样本才能学到好的策略<br>
        3. <strong>离散化限制：</strong>连续状态和动作需要离散化，影响精度<br>
        4. <strong>参数敏感：</strong>学习效果对参数设置较敏感<br>
        5. <strong>探索效率低：</strong>随机探索效率不高<br><br>
        <strong>改进方法：</strong><br>
        • <strong>函数近似：</strong>用神经网络代替Q-table (DQN)<br>
        • <strong>经验回放：</strong>存储和重用经验样本<br>
        • <strong>优先级采样：</strong>优先采样重要的经验<br>
        • <strong>改进探索策略：</strong>如UCB、汤普森采样等<br>
        • <strong>分层强化学习：</strong>分解复杂任务为子任务`
    }
];

// 等待teachInfos加载完成后初始化教程
function initQLearningTeach() {
    if (typeof teachInfos !== 'undefined' && teachInfos.length > 0) {
        console.log('Q-learning教程已加载，共', teachInfos.length, '个步骤');
        // 这里可以添加教程初始化逻辑
    } else {
        console.error('teachInfos未定义或为空');
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQLearningTeach);
} else {
    initQLearningTeach();
}