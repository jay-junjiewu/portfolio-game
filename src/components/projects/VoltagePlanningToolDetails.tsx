const VoltagePlanningToolDetails = () => {
  return (
    <section className="project-detail">
      <p>
        A per-asset, data-driven voltage planning tool that evaluates whether network intervention
        is required and, if so, which option delivers the best cost-effectiveness under photovoltaic
        (PV) injections and load variability.
      </p>

      <div className="project-links">
        <a
          href="https://github.com/jay-junjiewu/voltage_planning_tool"
          target="_blank"
          rel="noreferrer"
          className="chip chip-link"
        >
          GitHub
        </a>
      </div>

      <h3>Problem</h3>
      <p>
        High PV penetration on distribution networks drives voltage non-compliance that is
        intermittent, hard to observe from sparse breach events alone, and difficult to attribute
        to a specific cause. The tool operationalises a repeatable ML workflow to quantify
        near-breach risk, estimate counterfactual outcomes without intervention, measure avoided
        risk, and support evidence-based planning decisions.
      </p>

      <h3>Methodology</h3>
      <p>
        Rather than targeting hard breach events (rare and noisy), the tool uses{" "}
        <em>near-breach risk</em> as its primary signal, a metric that responds earlier to PV
        export peaks, cloud-edge ramps, and load swings. The five-step workflow:
      </p>
      <ul>
        <li>Observed outcomes calculated from measured voltage data and annualised for cross-window comparability.</li>
        <li>Uncertainty quantified via day-block bootstrap resampling to account for serial correlation.</li>
        <li>Counterfactual modelling trains on Year-1 operating conditions (excluding voltage as a feature) and applies to Year-2 to estimate what would have occurred without intervention.</li>
        <li>Population Stability Index assesses feature distribution drift between periods to flag regime changes.</li>
        <li>Decision logic requires both cost efficiency and compliance with residual risk targets.</li>
      </ul>

      <h3>Interventions evaluated</h3>
      <p>
        <strong>Tap Change:</strong> A low-cost operational voltage adjustment. Highly effective
        at reducing persistent over/undervoltage but with limited impact on short-term variance.
      </p>
      <p>
        <strong>STATCOM:</strong> A capital intervention providing fast reactive power support.
        Effective at reducing PV-driven fluctuations; typically justified only where residual risk
        remains high after operational controls.
      </p>

      <h3>Outputs</h3>
      <p>
        Per asset, the tool produces annualised violation and near-breach risk metrics with 95%
        confidence intervals, counterfactual vs. observed risk comparisons, cost-effectiveness
        rankings (capital expenditure per avoided risk-hour), benefit-vs-cost visualisations, and
        ROI sensitivity analysis under uncertainty.
      </p>
    </section>
  );
};

export default VoltagePlanningToolDetails;
