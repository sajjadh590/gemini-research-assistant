import numpy as np
from statsmodels.stats.power import TTestIndPower

class StatsEngine:
    def calculate_sample_size(self, effect_size, alpha=0.05, power=0.8):
        if effect_size <= 0: return 0
        analysis = TTestIndPower()
        try:
            n = analysis.solve_power(effect_size=effect_size, power=power, alpha=alpha, ratio=1.0)
            return int(np.ceil(n))
        except:
            return 0