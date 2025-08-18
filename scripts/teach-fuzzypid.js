// scripts/teach-fuzzypid.js

const teachInfos = [
    {
        title: "模糊PID控制原理",
        content: `模糊PID控制是将模糊逻辑与传统PID控制相结合的智能控制方法，通过模糊推理在线调整PID参数，实现控制器的自适应调节。<br><br>
        <strong>核心思想：</strong><br>
        1. <strong>模糊化：</strong>将精确的误差和误差变化率转换为模糊语言变量<br>
        2. <strong>模糊推理：</strong>基于专家规则库进行模糊逻辑推理<br>
        3. <strong>去模糊化：</strong>将模糊推理结果转换为精确的PID参数调整量<br>
        4. <strong>参数更新：</strong>在线更新PID参数实现自适应控制<br><br>
        <strong>系统结构：</strong><br>
        • 输入变量：误差e、误差变化率ec<br>
        • 输出变量：ΔKp、ΔKi、ΔKd<br>
        • 模糊集：NB(负大)、NM(负中)、NS(负小)、ZO(零)、PS(正小)、PM(正中)、PB(正大)<br>
        • 控制律：Kp = Kp0 + ΔKp，Ki = Ki0 + ΔKi，Kd = Kd0 + ΔKd`
    },
    {
        title: "界面操作指南",
        content: `在模糊PID控制界面中，你可以体验智能控制的自适应特性：<br><br>
        <strong>基本操作：</strong><br>
        • <strong>推动小球：</strong>用鼠标拖动小球到不同位置，观察参数自适应调整<br>
        • <strong>设置目标：</strong>点击画布设置目标位置，观察跟踪过程<br>
        • <strong>施加干扰：</strong>在干扰控制区域添加恒定干扰力<br><br>
        <strong>观察要点：</strong><br>
        • 注意Kp、Ki、Kd参数的在线变化过程<br>
        • 观察不同误差阶段参数调整的规律<br>
        • 比较模糊PID与普通PID的性能差异<br>
        • 体验系统对扰动的自适应能力`
    },
    {
        title: "参数调试指南",
        content: `模糊PID控制器包含基础PID参数和模糊控制参数，需要合理设置：<br><br>
        <strong>基础PID参数：</strong><br>
        • <strong>Kp0、Ki0、Kd0：</strong>基础PID参数，建议先用普通PID调试好基础值<br>
        • <strong>maxInt：</strong>积分限幅，防止积分饱和<br>
        • <strong>maxOut：</strong>输出限幅，保护执行器<br><br>
        <strong>模糊控制参数：</strong><br>
        • <strong>Ke (误差量化因子)：</strong>控制误差模糊化的灵敏度<br>
        - 值越大：对误差越敏感，调整越频繁<br>
        - 值越小：对误差不敏感，调整平缓<br><br>
        • <strong>Kec (误差变化率量化因子)：</strong>控制误差变化率模糊化的灵敏度<br>
        • <strong>Ku_p、Ku_i、Ku_d：</strong>输出比例因子，控制参数调整幅度<br>
        - 值越大：参数调整幅度越大，响应越快但可能振荡<br>
        - 值越小：参数调整幅度小，响应平缓但可能迟缓<br><br>
        <strong>调试建议：</strong><br>
        1. 先用普通PID调好基础参数Kp0、Ki0、Kd0<br>
        2. 设置合适的Ke、Kec值，使模糊化覆盖合理范围<br>
        3. 调整Ku_p、Ku_i、Ku_d，平衡响应速度和稳定性`
    },
    {
        title: "模糊规则设计",
        content: `模糊规则是模糊PID的核心，合理的规则设计对控制性能至关重要：<br><br>
        <strong>规则设计原则：</strong><br>
        1. <strong>误差大时：</strong>增大Kp快速响应，减小Ki防止积分饱和<br>
        2. <strong>误差中等时：</strong>适当Kp保证稳定性，增大Ki消除静差<br>
        3. <strong>误差小时：</strong>减小Kp防止超调，增大Kd提高阻尼<br>
        4. <strong>误差变化率大时：</strong>增大Kd抑制振荡<br>
        5. <strong>误差变化率小时：</strong>适当减小Kd<br><br>
        <strong>典型规则示例：</strong><br>
        • IF e=PB AND ec=NB THEN ΔKp=PB, ΔKi=NB, ΔKd=PS<br>
        • IF e=ZO AND ec=ZO THEN ΔKp=ZO, ΔKi=ZO, ΔKd=PS<br>
        • IF e=NB AND ec=PB THEN ΔKp=PB, ΔKi=NB, ΔKd=PB<br><br>
        <strong>规则优化建议：</strong><br>
        • 基于控制经验和系统特性设计规则<br>
        • 通过仿真或实验验证规则的有效性<br>
        • 可以使用遗传算法等优化方法自动优化规则库`
    },
    {
        title: "模糊PID的优势与应用",
        content: `模糊PID结合了模糊逻辑的智能性和PID控制的简单性，具有独特优势：<br><br>
        <strong>主要优势：</strong><br>
        1. <strong>自适应性强：</strong>能够根据工况自动调整PID参数<br>
        2. <strong>鲁棒性好：</strong>对参数变化和外部干扰不敏感<br>
        3. <strong>不依赖精确模型：</strong>基于专家经验，不需要精确的数学模型<br>
        4. <strong>实现简单：</strong>在传统PID基础上增加模糊逻辑层<br>
        5. <strong>易于理解：</strong>规则形式直观，便于工程师理解和调试<br><br>
        <strong>典型应用场景：</strong><br>
        • <strong>工业过程控制：</strong>温度、压力、流量等过程控制<br>
        • <strong>电机控制：</strong>伺服电机、步进电机的精确控制<br>
        • <strong>机器人控制：</strong>关节位置、速度控制<br>
        • <strong>汽车电子：</strong>发动机控制、ABS系统<br>
        • <strong>家电控制：</strong>空调、洗衣机等智能家电<br><br>
        <strong>实际应用建议：</strong><br>
        • 对于非线性、时变系统效果显著<br>
        • 在传统PID难以满足要求时考虑使用<br>
        • 需要一定的专家经验来设计规则库`
    }
];

// 等待teachInfos加载完成后初始化教程
function initFuzzyPIDTeach() {
    if (typeof teachInfos !== 'undefined' && teachInfos.length > 0) {
        console.log('模糊PID教程已加载，共', teachInfos.length, '个步骤');
        // 这里可以添加教程初始化逻辑
    } else {
        console.error('teachInfos未定义或为空');
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFuzzyPIDTeach);
} else {
    initFuzzyPIDTeach();
}