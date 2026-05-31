const PhaseDiagramCalculations = {
    getLiquidusTemp: function(comp) {
        const meltingPointPb = 327.5;
        const meltingPointSn = 231.9;
        const eutecticTemp = 183;
        const eutecticComp = 61.9;
        
        if (comp <= eutecticComp) {
            const ratio = comp / eutecticComp;
            return meltingPointPb - (meltingPointPb - eutecticTemp) * Math.pow(ratio, 0.8);
        } else {
            const ratio = (100 - comp) / (100 - eutecticComp);
            return meltingPointSn - (meltingPointSn - eutecticTemp) * Math.pow(ratio, 0.8);
        }
    },

    calculatePbSnPhaseInfo: function(temp, comp) {
        const eutecticTemp = 183;
        const eutecticComp = 61.9;
        const maxSolubilityAlpha = 19;
        const maxSolubilityBeta = 97.5;
        
        if (temp > eutecticTemp + 50) {
            return {
                phases: ['L'],
                composition: { L: 100 },
                description: '完全液相区'
            };
        } else if (temp > eutecticTemp) {
            if (comp < eutecticComp) {
                const wa = ((eutecticComp - comp) / (eutecticComp - maxSolubilityAlpha)) * 100;
                return {
                    phases: ['L', 'α'],
                    composition: { L: Math.max(0, 100 - wa), α: Math.min(100, wa) },
                    description: 'L + α 两相区'
                };
            } else {
                const wb = ((comp - maxSolubilityBeta) / (maxSolubilityBeta - eutecticComp)) * 100;
                return {
                    phases: ['L', 'β'],
                    composition: { L: Math.max(0, 100 - wb), β: Math.min(100, wb) },
                    description: 'L + β 两相区'
                };
            }
        } else {
            const wa = ((100 - comp) / 81) * 100;
            return {
                phases: ['α', 'β'],
                composition: { α: Math.max(0, wa), β: Math.max(0, 100 - wa) },
                description: 'α + β 共晶组织'
            };
        }
    },

    calculateFeCPhaseInfo: function(temp, comp) {
        const eutectoidTemp = 727;
        const eutecticTemp = 1148;
        const eutecticComp = 4.3;
        
        if (temp > eutecticTemp + 100) {
            return {
                phases: ['L'],
                composition: { L: 100 },
                description: '钢水完全液相区'
            };
        } else if (temp > eutectoidTemp + 100) {
            return {
                phases: ['γ'],
                composition: { γ: 100 },
                description: '奥氏体单相区'
            };
        } else if (temp > eutectoidTemp) {
            if (comp < 0.77) {
                const wa = (0.77 - comp) / 0.77 * 100;
                return {
                    phases: ['α', 'γ'],
                    composition: { α: wa, γ: 100 - wa },
                    description: '亚共析钢，奥氏体 + 铁素体'
                };
            } else {
                return {
                    phases: ['γ', 'Fe₃C'],
                    composition: { γ: 80, Fe₃C: 20 },
                    description: '过共析钢，奥氏体 + 渗碳体'
                };
            }
        } else {
            if (comp < 0.77) {
                const wa = (0.77 - comp) / 0.77 * 100;
                return {
                    phases: ['α', 'P'],
                    composition: { α: wa, P: 100 - wa },
                    description: '室温组织：铁素体 + 珠光体'
                };
            } else {
                const pc = (6.69 - comp) / 6.69 * 100;
                return {
                    phases: ['P', 'Fe₃C'],
                    composition: { P: pc, Fe₃C: 100 - pc },
                    description: '室温组织：珠光体 + 二次渗碳体'
                };
            }
        }
    },

    leverLaw: function(C0, Ca, Cb) {
        const diff = Cb - Ca;
        if (Math.abs(diff) < 0.0001) {
            return { phase1: C0 <= Ca ? 100 : 0, phase2: C0 >= Cb ? 100 : 0 };
        }
        const wa = ((Cb - C0) / diff) * 100;
        const wb = ((C0 - Ca) / diff) * 100;
        return { phase1: Math.max(0, Math.min(100, wa)), phase2: Math.max(0, Math.min(100, wb)) };
    },

    calculateEutecticFraction: function(C0, Cprimary, Ceutectic) {
        const diff = Ceutectic - Cprimary;
        if (Math.abs(diff) < 0.0001) {
            return { proeutectic: 50, eutectic: 50 };
        }
        let proeutectic = ((Ceutectic - C0) / diff * 100;
        proeutectic = Math.max(0, Math.min(100, proeutectic));
        return { proeutectic, eutectic: 100 - proeutectic };
    },

    calculateEutectoidFraction: function(C0, Cferrite, Ceutectoid) {
        const diff = Ceutectoid - Cferrite;
        if (Math.abs(diff) < 0.0001) {
            return { proeutectoid: 50, pearlite: 50 };
        }
        let proeutectoid = ((Ceutectoid - C0) / diff) * 100;
        proeutectoid = Math.max(0, Math.min(100, proeutectoid));
        return { proeutectoid, pearlite: 100 - proeutectoid };
    },

    gibbsFreeEnergyLiquid: function(T, comp) {
        const H0 = -5000;
        const S0 = 20;
        const R = 8.314;
        const x = comp / 100;
        const idealMixing = R * T * (x * Math.log(x) + (1 - x) * Math.log(1 - x));
        return H0 - T * S0 + idealMixing;
    },

    gibbsFreeEnergySolid: function(T, comp) {
        const H0 = -10000;
        const S0 = 10;
        const R = 8.314;
        const x = comp / 100;
        const idealMixing = R * T * (x * Math.log(x) + (1 - x) * Math.log(1 - x));
        return H0 - T * S0 + idealMixing;
    },

    chemicalPotential: function(phase, T, comp) {
        const R = 8.314;
        const x = comp / 100;
        if (phase === 'alpha') {
            return this.gibbsFreeEnergySolid(T, comp) + R * T * (1 - x) * 0.5;
        } else {
            return this.gibbsFreeEnergyLiquid(T, comp) + R * T * x * 0.5;
        }
    },

    findCommonTangent: function(T) {
        for (let ca = 5; ca <= 50; ca += 5) {
            for (let cb = 50; cb <= 95; cb += 5) {
                const ga = this.gibbsFreeEnergySolid(T, ca);
                const gb = this.gibbsFreeEnergyLiquid(T, cb);
                const slope = (gb - ga) / (cb - ca);
                if (Math.abs(slope) < 100) {
                    return { C_alpha: ca, C_beta: cb };
                }
            }
        }
        return null;
    },

    calculateLiquidusComposition: function(T) {
        const eutecticTemp = 183;
        const eutecticComp = 61.9;
        if (T <= eutecticTemp) return eutecticComp;
        return 50 + (T - eutecticTemp) * 0.3;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhaseDiagramCalculations;
}
