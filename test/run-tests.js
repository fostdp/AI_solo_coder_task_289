const PhaseDiagramCalculations = require('./calculations.js');
global.PhaseDiagramCalculations = PhaseDiagramCalculations;

const { PbSnTests, FeCTests, LeverLawTests, CALPHADTests } = require('./phase-diagram-tests.js');

console.log('========================================');
console.log('   材料科学相图计算测试套件');
console.log('========================================\n');

const pbSnResults = PbSnTests.runAllTests();
const feCResults = FeCTests.runAllTests();
const leverResults = LeverLawTests.runAllTests();
const calphadResults = CALPHADTests.runAllTests();

function printCategoryResults(name, results, color) {
    const passRate = (results.passed / results.total * 100).toFixed(1);
    console.log(`\n[${name}] ${results.passed}/${results.total} 通过 (${passRate}%)`);
    results.results.forEach(r => {
        const status = r.passed ? '✓ PASS' : '✗ FAIL';
        console.log(`  ${status} - ${r.name}`);
        if (!r.passed) {
            console.log(`        ${r.message}`);
        }
    });
}

printCategoryResults('Pb-Sn 二元相图', pbSnResults);
printCategoryResults('Fe-C 铁碳相图', feCResults);
printCategoryResults('杠杆定律计算', leverResults);
printCategoryResults('CALPHAD 热力学', calphadResults);

const totalPassed = pbSnResults.passed + feCResults.passed + leverResults.passed + calphadResults.passed;
const totalTests = pbSnResults.total + feCResults.total + leverResults.total + calphadResults.total;
const overallRate = (totalPassed / totalTests * 100).toFixed(1);

console.log('\n========================================');
console.log(`   总计: ${totalPassed}/${totalTests} 测试通过`);
console.log(`   总体通过率: ${overallRate}%`);
console.log('========================================');

process.exit(totalPassed === totalTests ? 0 : 1);
