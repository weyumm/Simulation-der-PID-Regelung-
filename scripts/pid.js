class PID{
	constructor(p,i,d,mi,mo){
		this.kp=p;
		this.ki=i;
		this.kd=d;
		this.maxInt=mi;
		this.maxOut=mo;
		this.error=0;
		this.lastError=0;
		this.integral=0;
		this.output=0;
	}
	limit(value,min,max){
		return (value<min)?min:(value>max?max:value);
	}
	calc(ref,fdb){
		this.lastError=this.error;
		this.error=ref-fdb;
		var pErr=this.error*this.kp;
		var dErr=(this.error-this.lastError)*this.kd;
		this.integral+=this.ki*this.error;
		this.integral=this.limit(this.integral,-this.maxInt,this.maxInt);
		var sumErr=pErr+dErr+this.integral;
		this.output=this.limit(sumErr,-this.maxOut,this.maxOut);
	}
	clear(){
		this.error=this.lastError=this.integral=this.output=0;
	}
}

class CascadePID{
	constructor(inParams,outParams){
		this.inner=new PID(inParams[0],inParams[1],inParams[2],inParams[3],inParams[4]);
		this.outer=new PID(outParams[0],outParams[1],outParams[2],outParams[3],outParams[4])
		this.output=0;
	}
	calc(outRef,outFdb,inFdb){
		this.outer.calc(outRef,outFdb);
		this.inner.calc(this.outer.output,inFdb);
		this.output=this.inner.output;
	}
	clear(){
		this.inner.clear();
		this.outer.clear();
	}
}
class FuzzyPID {
    constructor(kp, ki, kd, level=5) {
        this.kp = kp;    // 比例因子
        this.ki = ki;    // 积分因子
        this.kd = kd;    // 微分因子
        this.level = Math.max(3, Math.min(7, level)); // 模糊等级(3-7)
        this.errorHistory = [];
        this.maxHistory = 10;
        
        // 初始化模糊规则表
        this.initMembershipFunctions();
        this.initRuleBase();
    }

    initMembershipFunctions() {
        // 三角隶属度函数
        this.mf = {
            NB: [-1, -1, -0.6],
            NM: [-0.8, -0.4, 0],
            NS: [-0.3, -0.1, 0.2],
            ZO: [-0.1, 0, 0.1],
            PS: [-0.2, 0.1, 0.3],
            PM: [0, 0.4, 0.8],
            PB: [0.6, 1, 1]
        };
    }

    initRuleBase() {
        // 模糊控制规则表
        this.rules = [
            // 误差变化率Δe | 误差e
            // NB   NM   NS   ZO   PS   PM   PB
            ['PB', 'PB', 'PM', 'PM', 'PS', 'ZO', 'ZO'], // NB
            ['PB', 'PB', 'PM', 'PS', 'PS', 'ZO', 'NS'], // NM
            ['PM', 'PM', 'PM', 'PS', 'ZO', 'NS', 'NS'], // NS
            ['PM', 'PM', 'PS', 'ZO', 'NS', 'NM', 'NM'], // ZO
            ['PS', 'PS', 'ZO', 'NS', 'NS', 'NM', 'NM'], // PS
            ['PS', 'ZO', 'NS', 'NM', 'NM', 'NM', 'NB'], // PM
            ['ZO', 'ZO', 'NM', 'NM', 'NM', 'NB', 'NB']  // PB
        ];
    }

    // 模糊推理计算
    calc(setpoint, actual) {
        const e = (setpoint - actual) / setpoint; // 归一化误差
        const delta_e = e - (this.errorHistory[0] || 0);
        this.errorHistory.unshift(e);
        if(this.errorHistory.length > this.maxHistory) this.errorHistory.pop();

        // 模糊化输入
        const e_fuzzy = this.fuzzify(e);
        const delta_e_fuzzy = this.fuzzify(delta_e);

        // 规则推理
        let output = {NB:0, NM:0, NS:0, ZO:0, PS:0, PM:0, PB:0};
        for(let i=0; i<this.rules.length; i++){
            for(let j=0; j<this.rules[i].length; j++){
                const ruleStrength = Math.min(e_fuzzy[i], delta_e_fuzzy[j]);
                const outputTerm = this.rules[i][j];
                output[outputTerm] = Math.max(output[outputTerm], ruleStrength);
            }
        }

        // 解模糊（加权平均法）
        let numerator = 0, denominator = 0;
        for(const term in output){
            const value = this.mf[term][1]; // 取隶属度函数的中心值
            numerator += value * output[term];
            denominator += output[term];
        }
        const delta_u = denominator !== 0 ? numerator / denominator : 0;

        // 输出增量
        return this.kp * delta_u + 
               this.ki * e * delta_u + 
               this.kd * delta_e * delta_u;
    }

    fuzzify(value) {
        // 计算各模糊集的隶属度
        const degrees = {};
        for(const term in this.mf){
            const [a, b, c] = this.mf[term];
            degrees[term] = Math.max(0, Math.min(
                (value - a)/(b - a), 
                1, 
                (c - value)/(c - b)
            ));
        }
        return degrees;
    }

    clear() {
        this.errorHistory = [];
    }
}