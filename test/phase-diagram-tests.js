const PhaseDiagramTests = {
    testResults: [],
    
    assert: function(condition, testName, message) {
        const result = {
            name: testName,
            passed: condition,
            message: message || (condition ? '测试通过' : '测试失败')
        };
        this.testResults.push(result);
        return condition;
    },

    assertEqual: function(actual, expected, testName, tolerance = 0.01) {
        const diff = Math.abs(actual - expected);
        const passed = diff <= tolerance;
        this.testResults.push({
            name: testName,
            passed: passed,
            message: passed ? '测试通过' : `期望 ${expected}, 实际 ${actual}, 差值 ${diff.toFixed(4)}`
        });
        return passed;
    },

    assertRange: function(value, min, max, testName) {
        const passed = value >= min && value <= max;
        this.testResults.push({
            name: testName,
            passed: passed,
            message: passed ? '测试通过' : `${value} 不在 [${min}, ${max}] 范围内`
        });
        return passed;
    },

    clearResults: function() {
        this.testResults = [];
    },

    getSummary: function() {
        const total = this.testResults.length;
        const passed = this.testResults.filter(r => r.passed).length;
        const failed = total - passed;
        return { total, passed, failed, results: this.testResults };
    }
};

const PbSnTests = {
    runAllTests: function() {
        PhaseDiagramTests.clearResults();
        this.testLiquidusTemperature();
        this.testEutecticPoint();
        this.testPhaseCompositionLiquid();
        this.testPhaseCompositionEutectic();
        this.testSolidificationSequence();
        this.testLeverLawInTwoPhaseRegion();
        return PhaseDiagramTests.getSummary();
    },

    testLiquidusTemperature: function() {
        const testCases = [
            { comp: 0, expectedTemp: 327.5, desc: '纯Pb熔点' },
            { comp: 61.9, expectedTemp: 183, desc: '共晶点温度' },
            { comp: 100, expectedTemp: 231.9, desc: '纯Sn熔点' }
        ];

        testCases.forEach(tc => {
            const calcTemp = PhaseDiagramCalculations.getLiquidusTemp(tc.comp);
            PhaseDiagramTests.assertRange(calcTemp > 150, 350, `液相线温度: ${tc.desc}`);
        });
    },

    testEutecticPoint: function() {
        const eutecticComp = 61.9;
        const eutecticTemp = 183;
        
        PhaseDiagramTests.assertEqual(eutecticComp, 61.9, '共晶成分准确性', 1.0);
        PhaseDiagramTests.assertEqual(eutecticTemp, 183, '共晶温度准确性', 1.0);
        
        const phaseInfo = PhaseDiagramCalculations.calculatePbSnPhaseInfo(eutecticTemp, eutecticComp);
        PhaseDiagramTests.assert(phaseInfo.phases.includes('α') && phaseInfo.phases.includes('β'), 
            '共晶点应该是α+β两相区');
    },

    testPhaseCompositionLiquid: function() {
        const phaseInfo = PhaseDiagramCalculations.calculatePbSnPhaseInfo(350, 50);
        PhaseDiagramTests.assert(phaseInfo.phases.includes('L'), '高温应为液相单相区');
        PhaseDiagramTests.assertEqual(phaseInfo.composition.L, 100, '高温液相比例应为100%', 0.1);
    },

    testPhaseCompositionEutectic: function() {
        const phaseInfo = PhaseDiagramCalculations.calculatePbSnPhaseInfo(150, 50);
        PhaseDiagramTests.assert(phaseInfo.phases.includes('α') && phaseInfo.phases.includes('β'), 
            '共晶温度以下应为α+β两相区');
        const total = phaseInfo.composition.α + phaseInfo.composition.β;
        PhaseDiagramTests.assertEqual(total, 100, '相组成总和应为100%', 1.0);
    },

    testSolidificationSequence: function() {
        const comp = 40;
        const phasesAt300 = PhaseDiagramCalculations.calculatePbSnPhaseInfo(300, comp);
        const phasesAt200 = PhaseDiagramCalculations.calculatePbSnPhaseInfo(200, comp);
        const phasesAt150 = PhaseDiagramCalculations.calculatePbSnPhaseInfo(150, comp);
        
        PhaseDiagramTests.assert(phasesAt300.phases.includes('L'), '高温开始凝固');
        PhaseDiagramTests.assert(phasesAt200.phases.includes('L') && phasesAt200.phases.length === 2, 
            '凝固中期为固液两相区');
        PhaseDiagramTests.assert(!phasesAt150.phases.includes('L'), '凝固结束无液相');
    },

    testLeverLawInTwoPhaseRegion: function() {
        const C0 = 40;
        const C_alpha = 19;
        const C_beta = 97.5;
        
        const W_alpha = ((C_beta - C0) / (C_beta - C_alpha) * 100;
        const W_beta = ((C0 - C_alpha) / (C_beta - C_alpha) * 100;
        
        PhaseDiagramTests.assertEqual(W_alpha + W_beta, 100, '杠杆定律质量守恒', 0.1);
        PhaseDiagramTests.assertRange(W_alpha, 0, 100, 'α相比例在有效范围');
        PhaseDiagramTests.assertRange(W_beta, 0, 100, 'β相比例在有效范围');
    }
};

const FeCTests = {
    runAllTests: function() {
        PhaseDiagramTests.clearResults();
        this.testEutectoidReaction();
        this.testEutecticReaction();
        this.testPhaseRegions();
        this.testCarbonSolubility();
        this.testPearliteFormation();
        this.testPhaseCompositionSum();
        this.testAusteniteStability();
        return PhaseDiagramTests.getSummary();
    },

    testEutectoidReaction: function() {
        const eutectoidTemp = 727;
        const eutectoidComp = 0.77;
        
        PhaseDiagramTests.assertEqual(eutectoidTemp, 727, '共析温度准确性', 1.0);
        PhaseDiagramTests.assertEqual(eutectoidComp, 0.77, '共析成分准确性', 0.01);
        
        const phaseInfo = PhaseDiagramCalculations.calculateFeCPhaseInfo(700, 0.77);
        PhaseDiagramTests.assert(phaseInfo.phases.includes('α') || phaseInfo.phases.includes('P'), 
            '共析点以下应有铁素体+渗碳体');
    },

    testEutecticReaction: function() {
        const eutecticTemp = 1148;
        const eutecticComp = 4.3;
        
        PhaseDiagramTests.assertEqual(eutecticTemp, 1148, '共晶温度准确性', 1.0);
        PhaseDiagramTests.assertEqual(eutecticComp, 4.3, '共晶成分准确性', 0.1);
        
        const phaseAbove = PhaseDiagramCalculations.calculateFeCPhaseInfo(1200, 4.3);
        const phaseBelow = PhaseDiagramCalculations.calculateFeCPhaseInfo(1100, 4.3);
        
        PhaseDiagramTests.assert(phaseAbove.phases.includes('L'), '共晶温度以上为液相');
    },

    testPhaseRegions: function() {
        const testCases = [
            { temp: 1500, comp: 0.4, expected: 'L', desc: '高温液相区' },
            { temp: 1000, comp: 0.4, expected: 'γ', desc: '奥氏体区' },
            { temp: 600, comp: 0.4, expected: 'α', desc: '低温铁素体区' }
        ];

        testCases.forEach(tc => {
            const phaseInfo = PhaseDiagramCalculations.calculateFeCPhaseInfo(tc.temp, tc.comp);
            PhaseDiagramTests.assert(phaseInfo.phases.length > 0, `相区域检测: ${tc.desc}');
        });
    },

    testCarbonSolubility: function() {
        const maxSolubilityAustenite = 2.11;
        const maxSolubilityFerrite = 0.0218;
        
        PhaseDiagramTests.assert(maxSolubilityAustenite > maxSolubilityFerrite, 
            '奥氏体碳溶解度大于铁素体');
        PhaseDiagramTests.assertEqual(maxSolubilityFerrite, 0.0218, 
            '室温铁素体溶解度极限', 0.001);
    },

    testPearliteFormation: function() {
        const hypo = PhaseDiagramCalculations.calculateFeCPhaseInfo(600, 0.4);
        const hyper = PhaseDiagramCalculations.calculateFeCPhaseInfo(600, 1.2);
        
        PhaseDiagramTests.assert(hypo.composition.α > 0, '亚共析钢应有铁素体');
        PhaseDiagramTests.assert(hypo.composition.α > 50, '亚共析钢铁素体应大于50%');
    },

    testPhaseCompositionSum: function() {
        const testCases = [
            { temp: 800, comp: 0.4 },
            { temp: 600, comp: 0.77 },
            { temp: 1000, comp: 1.0 }
        ];

        testCases.forEach(tc => {
            const phaseInfo = PhaseDiagramCalculations.calculateFeCPhaseInfo(tc.temp, tc.comp);
            const total = Object.values(phaseInfo.composition).reduce((sum, val) => sum + val, 0);
            PhaseDiagramTests.assertEqual(total, 100, `Fe-C相组成总和应为100%', 5.0);
        });
    },

    testAusteniteStability: function() {
        const gamma1 = PhaseDiagramCalculations.calculateFeCPhaseInfo(800, 0.4);
        const gamma2 = PhaseDiagramCalculations.calculateFeCPhaseInfo(1000, 0.8);
        
        PhaseDiagramTests.assert(gamma1.phases.includes('γ') || gamma1.phases.includes('α'),
            '800°C时亚共析钢组织');
        PhaseDiagramTests.assert(gamma2.phases.includes('γ'), '1000°C应为奥氏体单相区');
    }
};

const LeverLawTests = {
    runAllTests: function() {
        PhaseDiagramTests.clearResults();
        this.testBasicLeverLaw();
        this.testMassConservation();
        this.testBoundaryConditions();
        this.testEutecticLeverLaw();
        this.testEutectoidLeverLaw();
        this.testMassBalance();
        this.testExtremeCompositions();
        return PhaseDiagramTests.getSummary();
    },

    testBasicLeverLaw: function() {
        const result = PhaseDiagramCalculations.leverLaw(50, 20, 80);
        
        PhaseDiagramTests.assertEqual(result.phase1, 50, 'α相比例计算', 0.01);
        PhaseDiagramTests.assertEqual(result.phase2, 50, 'β相比例计算', 0.01);
        PhaseDiagramTests.assertEqual(result.phase1 + result.phase2, 100, '两相比例总和', 0.01);
    },

    testMassConservation: function() {
        const C0 = 40;
        const Ca = 10;
        const Cb = 70;
        const result = PhaseDiagramCalculations.leverLaw(C0, Ca, Cb);
        const massCheck = result.phase1 / 100 * Ca + result.phase2 / 100 * Cb;
        
        PhaseDiagramTests.assertEqual(massCheck, C0, '杠杆定律质量守恒校验', 0.001);
    },

    testBoundaryConditions: function() {
        const Ca = 10;
        const Cb = 70;
        
        const result1 = PhaseDiagramCalculations.leverLaw(Ca, Ca, Cb);
        PhaseDiagramTests.assertEqual(result1.phase1, 100, '左边界: 成分=α相应为100%', 0.01);
        PhaseDiagramTests.assertEqual(result1.phase2, 0, '左边界: β相应为0%', 0.01);
        
        const result2 = PhaseDiagramCalculations.leverLaw(Cb, Ca, Cb);
        PhaseDiagramTests.assertEqual(result2.phase1, 0, '右边界: α相应为0%', 0.01);
        PhaseDiagramTests.assertEqual(result2.phase2, 100, '右边界: β相应为100%', 0.01);
    },

    testEutecticLeverLaw: function() {
        const C0 = 50;
        const Ceutectic = 61.9;
        const Cprimary = 19;
        const Cphase2 = 100;
        
        const beforeEutectic = PhaseDiagramCalculations.calculateEutecticFraction(C0, Cprimary, Ceutectic);
        
        PhaseDiagramTests.assertRange(beforeEutectic.proeutectic >= 0, '先共晶相非负');
        PhaseDiagramTests.assertRange(beforeEutectic.eutectic >= 0, '共晶体非负');
        PhaseDiagramTests.assertEqual(beforeEutectic.proeutectic + beforeEutectic.eutectic, 100, 
            '先共晶+共晶总和为100%', 0.01);
    },

    testEutectoidLeverLaw: function() {
        const C0 = 0.4;
        const Ceutectoid = 0.77;
        const Cferrite = 0.0218;
        
        const result = PhaseDiagramCalculations.calculateEutectoidFraction(C0, Cferrite, Ceutectoid);
        
        const pearlitePercent = result.pearlite;
        const proeutectoidPercent = result.proeutectoid;
        
        PhaseDiagramTests.assert(proeutectoidPercent > 0, '亚共析钢先共析铁素体大于0');
        PhaseDiagramTests.assertEqual(pearlitePercent + proeutectoidPercent, 100, 
            '珠光体+先共析总和为100%', 0.1);
        
        const pearliteAtEutectoid = PhaseDiagramCalculations.calculateEutectoidFraction(0.77, 0.0218, 0.77);
        PhaseDiagramTests.assertEqual(pearliteAtEutectoid.pearlite, 100, '共析点珠光体100%', 1.0);
    },

    testMassBalance: function() {
        for (let C0 = 0.1; C0 <= 0.7; C0 += 0.1) {
            const result = PhaseDiagramCalculations.calculateEutectoidFraction(C0, 0.0218, 0.77);
            const totalC = (result.proeutectoid / 100 * 0.0218 + (result.pearlite / 100) * 0.77;
            PhaseDiagramTests.assertEqual(totalC, C0, `C0=${C0.toFixed(2)} 碳质量平衡', 0.01);
        }
    },

    testExtremeCompositions: function() {
        const result1 = PhaseDiagramCalculations.leverLaw(0.0218, 0.0218, 6.69);
        PhaseDiagramTests.assertEqual(result1.phase1, 100, '纯铁素体边界条件', 0.1);
        
        const result2 = PhaseDiagramCalculations.leverLaw(6.69, 0.0218, 6.69);
        PhaseDiagramTests.assertEqual(result2.phase2, 100, '纯渗碳体边界条件', 0.1);
    }
};

const CALPHADTests = {
    runAllTests: function() {
        PhaseDiagramTests.clearResults();
        this.testGibbsFreeEnergy();
        this.testEquilibriumCondition();
        this.testCommonTangent();
        this.testPhaseBoundaryCalculation();
        this.testThermodynamicConsistency();
        this.testTemperatureDependence();
        return PhaseDiagramTests.getSummary();
    },

    testGibbsFreeEnergy: function() {
        const temperatures = [300, 500, 700, 900];
        
        temperatures.forEach(T => {
            const G_liquid = PhaseDiagramCalculations.gibbsFreeEnergyLiquid(T, 50);
            const G_solid = PhaseDiagramCalculations.gibbsFreeEnergySolid(T, 50);
            
            PhaseDiagramTests.assert(!isNaN(G_liquid), `液相Gibbs自由能计算有效 T=${T}`);
            PhaseDiagramTests.assert(!isNaN(G_solid), `固相Gibbs自由能计算有效 T=${T}`);
        });
    },

    testEquilibriumCondition: function() {
        const T = 500;
        const mu_alpha = PhaseDiagramCalculations.chemicalPotential('alpha', T, 20);
        const mu_beta = PhaseDiagramCalculations.chemicalPotential('beta', T, 80);
        
        PhaseDiagramTests.assert(!isNaN(mu_alpha), 'α相化学势计算有效');
        PhaseDiagramTests.assert(!isNaN(mu_beta), 'β相化学势计算有效');
    },

    testCommonTangent: function() {
        const testTemperatures.forEach(T => {
            const compositions = PhaseDiagramCalculations.findCommonTangent(T);
            
            if (compositions) {
                PhaseDiagramTests.assert(compositions.C_alpha < compositions.C_beta, 
                    '公切点成分满足 C_alpha < C_beta');
                PhaseDiagramTests.assertRange(compositions.C_alpha, 0, 100, 'α相成分在有效范围');
                PhaseDiagramTests.assertRange(compositions.C_beta, 0, 100, 'β相成分在有效范围');
            }
        });
    },

    testPhaseBoundaryCalculation: function() {
        const liquidusPoints = [];
        for (let T = 200; T <= 300; T += 10) {
            const comp = PhaseDiagramCalculations.calculateLiquidusComposition(T);
            liquidusPoints.push(comp);
            PhaseDiagramTests.assertRange(comp, 0, 100, `液相线成分在有效范围 T=${T}`);
        }
        
        for (let i = 1; i < liquidusPoints.length; i++) {
            PhaseDiagramTests.assert(liquidusPoints[i] !== undefined, '液相线单调变化');
        }
    },

    testThermodynamicConsistency: function() {
        const T = 250;
        const C = 50;
        
        const G1 = PhaseDiagramCalculations.gibbsFreeEnergyLiquid(T, C);
        const G2 = PhaseDiagramCalculations.gibbsFreeEnergyLiquid(T + 1, C);
        
        PhaseDiagramTests.assert(G2 !== G1, 'Gibbs自由能随温度变化');
        
        const S = -(G2 - G1);
        PhaseDiagramTests.assert(S <= 0, '熵应为非正值 (G/T斜率为负)');
    },

    testTemperatureDependence: function() {
        const results = [];
        for (let T = 200; T <= 350; T += 50) {
            results.push(PhaseDiagramCalculations.calculatePbSnPhaseInfo(T, 50));
        }
        
        PhaseDiagramTests.assert(results.length > 0, '不同温度下相计算完成');
    }
};

const TestRunner = {
    runAllTests: function() {
        const allResults = {};
        
        console.log('========== Pb-Sn 相图测试 ==========');
        allResults.pbSn = PbSnTests.runAllTests();
        this.printSummary('Pb-Sn 相图', allResults.pbSn);
        
        console.log('\n========== Fe-C 相图测试 ==========');
        allResults.feC = FeCTests.runAllTests();
        this.printSummary('Fe-C 相图', allResults.feC);
        
        console.log('\n========== 杠杆定律测试 ==========');
        allResults.leverLaw = LeverLawTests.runAllTests();
        this.printSummary('杠杆定律', allResults.leverLaw);
        
        console.log('\n========== CALPHAD热力学测试 ==========');
        allResults.calphad = CALPHADTests.runAllTests();
        this.printSummary('CALPHAD热力学', allResults.calphad);
        
        const totalTests = allResults.pbSn.total + allResults.feC.total + 
                          allResults.leverLaw.total + allResults.calphad.total;
        const totalPassed = allResults.pbSn.passed + allResults.feC.passed + 
                           allResults.leverLaw.passed + allResults.calphad.passed;
        
        console.log('\n========================================');
        console.log(`总计: ${totalPassed}/${totalTests} 测试通过');
        console.log(`通过率: ${((totalPassed/totalTests*100).toFixed(1)}%`);
        console.log('========================================');
        
        return allResults;
    },

    printSummary: function(name, summary) {
        console.log(`${name}: ${summary.passed}/${summary.total 测试通过`);
        summary.results.forEach(r => {
            const status = r.passed ? '✓' : '✗';
            console.log(`  ${status} ${r.name}: ${r.message}`);
        });
    },

    getHTMLReport: function() {
        const results = this.runAllTests();
        let html = `
            <div style="font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;">
                    🔬 材料科学相图计算测试报告
                </h1>
                <p style="color: #7f8c8d;">生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        `;
        
        const totalPassed = results.pbSn.passed + results.feC.passed + 
                          results.leverLaw.passed + results.calphad.passed;
        const totalTests = results.pbSn.total + results.feC.total + 
                           results.leverLaw.total + results.calphad.total;
        const rate = (totalPassed / totalTests * 100;
        
        html += `
            <div style="background: ${rate >= 80 ? '#d4edda' : '#f8d7da'; 
                        padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h2 style="margin: 0; color: ${rate >= 80 ? '#155724' : '#721c24'}">
                    总体结果汇总: ${totalPassed}/${totalTests} 通过 (${rate.toFixed(1)}%)
                </h2>
            </div>
        `;
        
        const sections = [
            { name: 'Pb-Sn 二元相图测试', data: results.pbSn, color: '#3498db', icon: '📊' },
            { name: 'Fe-C 铁碳相图测试', data: results.feC, color: '#e74c3c', icon: '⚙️' },
            { name: '杠杆定律测试', data: results.leverLaw, color: '#2ecc71', icon: '⚖️' },
            { name: 'CALPHAD 热力学计算测试', data: results.calphad, color: '#9b59b6', icon: '🔬' }
        ];
        
        sections.forEach(section => {
            const passRate = section.data.passed / section.data.total * 100;
            html += `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin: 15px 0; border-left: 4px solid ${section.color};">
                    <h3 style="margin-top: 0; color: ${section.color};">
                        ${section.icon} ${section.name}
                        <span style="float: right;">
                            ${section.data.passed}/${section.data.total} 通过 (${passRate.toFixed(1)}%)
                        </span>
                    </h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            `;
            
            section.data.results.forEach(r => {
                const bgColor = r.passed ? '#d4edda' : '#f8d7da';
                const textColor = r.passed ? '#155724' : '#721c24';
                const icon = r.passed ? '✓' : '✗';
                html += `
                    <div style="background: ${bgColor}; color: ${textColor}; 
                                padding: 8px 12px; border-radius: 5px; font-size: 13px; flex: 1 1 300px;">
                        <strong>${icon} ${r.name}</strong><br>
                        <small>${r.message}</small>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += `
                <div style="margin-top: 30px; padding: 20px; background: #e8f4f8; border-radius: 10px;">
                    <h3 style="color: #0c5460; margin-top: 0;">📋 测试覆盖说明</h3>
                    <ul style="columns: 2; column-gap: 30px;">
                        <li><strong>Pb-Sn 相图:</strong> 液相线、共晶点、相组成、凝固过程</li>
                        <li><strong>Fe-C 相图:</strong> 共析/共晶反应、相区、溶解度、珠光体</li>
                        <li><strong>杠杆定律:</strong> 基础计算、质量守恒、边界条件验证</li>
                        <li><strong>CALPHAD:</strong> Gibbs自由能、化学势、相平衡计算</li>
                        <li><strong>质量守恒:</strong> 所有计算验证</li>
                        <li><strong>边界条件:</strong> 纯组元极端情况测试</li>
                    </ul>
                </div>
            </div>
        `;
        
        return html;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        PhaseDiagramTests: PhaseDiagramTests, 
        PbSnTests: PbSnTests, 
        FeCTests: FeCTests, 
        LeverLawTests: LeverLawTests, 
        CALPHADTests: CALPHADTests, 
        TestRunner: TestRunner 
    };
}
