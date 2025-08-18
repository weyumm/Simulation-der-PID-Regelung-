// scripts/teach-adaptive.js

const teachInfos = [
    {
        title: "模型参考自适应控制 (MRAC) 原理",
        content: `模型参考自适应控制是一种先进的控制策略，它通过参考模型来定义期望的系统行为，并在线调整控制器参数以使实际系统跟踪参考模型的输出。<br><br>
        <strong>核心思想：</strong><br>
        1. <strong>参考模型：</strong>定义了理想的系统响应特性<br>
        2. <strong>自适应机制：</strong>根据跟踪误差在线调整控制器参数<br>
        3. <strong>控制律：</strong>结合名义控制和自适应控制项<br><br>
        <strong>数学原理：</strong><br>
        • 参考模型：ÿ_m + 2ζω_nẏ_m + ω_n²y_m = ω_n²r<br>
        • 跟踪误差：e = y_m - y<br>
        • 自适应参数更新：dθ/dt = Γφe - σΓθ`
    },
    {
        title: "界面操作指南",
        content: `在自适应控制界面中，你可以通过以下方式与系统交互：<br><br>
        <strong>基本操作：</strong><br>
        • <strong>推动小球：</strong>用鼠标拖动小球到任意位置，观察自适应控制器的响应<br>
        • <strong>修改目标位置：</strong>点击画布任意位置设置新的目标位置<br>
        • <strong>施加干扰：</strong>在干扰控制区域设置恒定干扰力<br><br>
        <strong>观察要点：</strong><br>
        • 注意小球如何跟踪参考模型的理想响应<br>
        • 观察自适应参数θ_a的在线调整过程<br>
        • 比较有/无自适应控制时的系统性能差异`
    },
    {
        title: "参数调试指南",
        content: `自适应控制器的参数调节对系统性能至关重要：<br><br>
        <strong>参考模型参数：</strong><br>
        • <strong>ω_n (自然频率)：</strong>控制响应速度，值越大响应越快<br>
        • <strong>ζ (阻尼比)：</strong>控制振荡特性，0.7-1.0为最佳范围<br><br>
        <strong>自适应参数：</strong><br>
        • <strong>Γ (自适应增益)：</strong>控制参数调整速度，过大可能导致振荡<br>
        • <strong>σ (σ-修改参数)：</strong>防止参数漂移，提高鲁棒性<br>
        • <strong>m_est (质量估计)：</strong>系统质量的先验估计值<br><br>
        <strong>调试建议：</strong><br>
        1. 先设置合适的参考模型参数(ω_n=2-5, ζ=0.7-0.9)<br>
        2. 调整自适应增益Γ，从小值开始逐渐增加<br>
        3. 设置适当的σ值(0.01-0.1)防止参数漂移`
    },
    {
        title: "性能优化技巧",
        content: `要获得良好的自适应控制性能，可以考虑以下优化策略：<br><br>
        <strong>收敛性优化：</strong><br>
        • 确保参考模型与实际系统的动态特性匹配<br>
        • 选择合适的自适应增益以平衡收敛速度和稳定性<br>
        • 使用σ-修改防止参数在有噪声时漂移<br><br>
        <strong>鲁棒性增强：</strong><br>
        • 增加死区机制，在误差很小时停止参数调整<br>
        • 使用投影算法确保参数在合理范围内<br>
        • 考虑未建模动态和外部干扰的影响<br><br>
        <strong>实际应用建议：</strong><br>
        • 在实际系统中，需要考虑执行器饱和和测量噪声<br>
        • 自适应控制适合参数缓慢变化或不确定的系统<br>
        • 对于快速变化的参数，可能需要更复杂的自适应算法`
    },
    {
        title: "常见问题解决",
        content: `在使用自适应控制时，可能会遇到以下典型问题：<br><br>
        <strong>参数漂移问题：</strong><br>
        <strong>现象：</strong>自适应参数持续增大或减小，最终导致系统不稳定<br>
        <strong>解决方法：</strong>增加σ-修改参数，或使用投影算法限制参数范围<br><br>
        <strong>收敛速度慢：</strong><br>
        <strong>现象：</strong>系统响应缓慢，跟踪误差收敛时间长<br>
        <strong>解决方法：</strong>适当增加自适应增益Γ，但要注意避免振荡<br><br>
        <strong>高频振荡：</strong><br>
        <strong>现象：</strong>控制输出或系统响应出现高频振荡<br>
        <strong>解决方法：</strong>减小自适应增益，增加参考模型的阻尼比<br><br>
        <strong>鲁棒性问题：</strong><br>
        <strong>现象：</strong>在有干扰或未建模动态时性能下降<br>
        <strong>解决方法：</strong>增加鲁棒项，使用更复杂的自适应律`
    }
];

// 等待teachInfos加载完成后初始化教程
function initAdaptiveTeach() {
    if (typeof teachInfos !== 'undefined' && teachInfos.length > 0) {
        console.log('自适应控制教程已加载，共', teachInfos.length, '个步骤');
        // 这里可以添加教程初始化逻辑
    } else {
        console.error('teachInfos未定义或为空');
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdaptiveTeach);
} else {
    initAdaptiveTeach();
}