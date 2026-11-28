const VoltagePlanningToolDetails = () => {
  return (
    <section className="project-detail">
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
        High PV penetration on distribution networks drives voltage noncompliance that is
        intermittent, hard to observe from sparse breach events alone, and difficult to attribute
        to a specific cause. The tool operationalises a repeatable ML workflow to quantify
        near-breach risk, estimate counterfactual outcomes without intervention, measure avoided
        risk, and support planning decisions backed by evidence.
      </p>

      <h3>Methodology</h3>
      <p>
        Rather than targeting hard breach events (rare and noisy), the tool uses{" "}
        <em>near-breach risk</em> as its primary signal, a metric that responds earlier to PV
        export peaks, ramps as clouds pass, and load swings. The five-step workflow:
      </p>
      <ul>
        <li>Observed outcomes calculated from measured voltage data and annualised so different windows can be compared.</li>
        <li>Uncertainty quantified via day-block bootstrap resampling to account for serial correlation.</li>
        <li>Counterfactual modelling trains on Year-1 operating conditions (excluding voltage as a feature) and applies to Year-2 to estimate what would have occurred without intervention.</li>
        <li>Population Stability Index assesses feature distribution drift between periods to flag regime changes.</li>
        <li>Decision logic requires both cost efficiency and compliance with residual risk targets.</li>
      </ul>

      <h3>Intervention strategies</h3>
      <p>
        The tool compares operational and capital intervention strategies on equal terms: each is
        scored by how much predicted voltage risk it avoids against what it costs, so planners can
        see where a cheap operational change is enough and where larger investment is justified.
      </p>

      <h3>Outputs</h3>
      <p>
        Per asset, the tool produces annualised violation and near-breach risk metrics with 95%
        confidence intervals, counterfactual vs. observed risk comparisons, cost effectiveness
        rankings (capital expenditure per avoided hour of risk), benefit versus cost charts, and
        ROI sensitivity analysis under uncertainty.
      </p>
    </section>
  );
};

export default VoltagePlanningToolDetails;
