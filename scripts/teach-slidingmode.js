// scripts/teach-slidingmode.js

const teachInfos = [
    {
        title: "滑模控制 (SMC) 原理",
        content: `滑模控制是一种鲁棒性很强的变结构控制方法，其核心思想是通过高速切换控制律，使系统状态在有限时间内到达并保持在预设的滑模面上。<br><br>
        <strong>核心概念：</strong><br>
        1. <strong>滑模面：</strong>定义了期望的系统动态特性<br>
        2. <strong>趋近律：</strong>设计控制律使系统状态趋向滑模面<br>
        3. <strong>等效控制：</strong>维持系统在滑模面上的理想控制<br>
        4. <strong>切换控制：</strong>克服不确定性和外部干扰<br><br>
        <strong>数学原理：</strong><br>
        • 滑模面：s = ė + λe (其中e为跟踪误差)<br>
        • 控制律：u = u_eq + u_sw<br>
        • 等效控制：u_eq = -m·v/λ<br>
        • 切换控制：u_sw = K·s - η·sat(s/φ)`
    },
    {
        title: "界面操作指南",
        content: `在滑模控制界面中，你可以通过以下方式体验滑模控制的特点：<br><br>
        <strong>基本操作：</strong><br>
        • <strong>推动小球：</strong>用鼠标拖动小球，观察滑模控制的快速响应<br>
        • <strong>设置目标：</strong>点击画布设置目标位置，观察跟踪性能<br>
        • <strong>施加干扰：</strong>在干扰控制区域添加恒定干扰力<br><br>
        <strong>观察要点：</strong><br>
        • 注意系统状态的快速收敛特性<br>
        • 观察滑模面s值的变化过程<br>
        • 体验滑模控制对干扰的强鲁棒性<br>
        • 注意控制输出可能出现的高频抖振现象`
    },
    {
        title: "参数调试指南",
        content: `滑模控制器的参数设计直接影响系统性能和抖振程度：<br><br>
        <strong>滑模面参数：</strong><br>
        • <strong>λ (lambda)：</strong>滑模面斜率，决定收敛速度和阻尼特性<br>
        - 值越大：收敛越快，但可能增加超调<br>
        - 值越小：响应平缓，但收敛速度慢<br><br>
        <strong>控制增益参数：</strong><br>
        • <strong>K (等效控制增益)：</strong>影响系统在滑模面上的动态<br>
        • <strong>η (eta)：</strong>切换控制增益，影响鲁棒性和抖振<br>
        - 值越大：鲁棒性越强，但抖振越明显<br>
        - 值越小：抖振减小，但鲁棒性下降<br><br>
        <strong>抖振抑制参数：</strong><br>
        • <strong>φ (phi)：</strong>饱和函数边界层厚度<br>
        - 值越大：抖振抑制效果越好，但跟踪精度下降<br>
        - 值越小：跟踪精度高，但抖振明显<br><br>
        <strong>调试建议：</strong><br>
        1. 先设置合适的λ值(1-5)以获得期望的收敛特性<br>
        2. 调整η值确保足够的鲁棒性<br>
        3. 设置φ值平衡抖振抑制和跟踪精度`
    },
    {
        title: "抖振抑制技术",
        content: `抖振是滑模控制的主要缺点，以下是几种有效的抖振抑制方法：<br><br>
        <strong>边界层技术：</strong><br>
        • 用饱和函数sat(s/φ)代替符号函数sign(s)<br>
        • 在边界层内采用线性控制，避免高频切换<br>
        • 边界层厚度φ需要在抖振抑制和精度间权衡<br><br>
        <strong>高阶滑模：</strong><br>
        • 设计高阶滑模面，如超螺旋算法<br>
        • 可以实现连续控制输出，完全消除抖振<br>
        • 但设计复杂度增加，需要更多状态信息<br><br>
        <strong>自适应滑模：</strong><br>
        • 在线调整切换增益η<br>
        • 根据不确定性程度自动调整控制强度<br>
        • 可以在保证鲁棒性的同时减小抖振<br><br>
        <strong>实际应用建议：</strong><br>
        • 对于执行器带宽有限的系统，边界层技术最实用<br>
        • 在高精度控制场合，可以考虑高阶滑模<br>
        • 自适应滑模适合不确定性变化范围大的系统`
    },
    {
        title: "滑模控制的优势与局限",
        content: `滑模控制具有独特的优势和明显的局限性：<br><br>
        <strong>主要优势：</strong><br>
        1. <strong>强鲁棒性：</strong>对参数变化和外部干扰不敏感<br>
        2. <strong>快速响应：</strong>有限时间收敛，响应速度快<br>
        3. <strong>设计简单：</strong>不需要精确的系统模型<br>
        4. <strong>实现容易：</strong>控制律结构简单，便于工程实现<br><br>
        <strong>主要局限：</strong><br>
        1. <strong>抖振问题：</strong>控制输出的高频切换现象<br>
        2. <strong>执行器要求：</strong>需要足够带宽的执行器<br>
        3. <strong>状态测量：</strong>通常需要全状态反馈<br>
        4. <strong>能耗较高：</strong>高频切换导致能量消耗较大<br><br>
        <strong>适用场景：</strong><br>
        • 机器人控制、电机控制等机电系统<br>
        • 航空航天、导弹制导等高可靠性要求场合<br>
        • 参数变化大、干扰强的工业过程控制`
    }
];

// 等待teachInfos加载完成后初始化教程
function initSlidingModeTeach() {
    if (typeof teachInfos !== 'undefined' && teachInfos.length > 0) {
        console.log('滑模控制教程已加载，共', teachInfos.length, '个步骤');
        // 这里可以添加教程初始化逻辑
    } else {
        console.error('teachInfos未定义或为空');
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSlidingModeTeach);
} else {
    initSlidingModeTeach();
}