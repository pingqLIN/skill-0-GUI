export const mockSkillData = {
  projectId: "SKILL-0-9942",
  projectName: "Automated Data Pipeline Skill",
  riskAssessment: {
    level: "Low",
    negativeIntent: 12,
    details: "No malicious patterns detected in the execution graph. Standard data transformation operations."
  },
  threeClassification: {
    category: "Data Processing",
    granularity: "Atomic",
    operability: 95
  },
  globalMetrics: {
    deliveryTime: 2.4,
    decisionConfidence: 94,
    reworkRate: 5,
    goalAchievementRate: 98
  },
  phases: [
    {
      id: "A",
      name: "Requirement Definition",
      input: ["raw_request", "constraints"],
      tasks: [
        "extract_goal",
        "define_success_criteria",
        "identify_constraints"
      ],
      decisionNodes: [
        {
          id: "A1",
          question: "Is requirement actionable?",
          rules: ["completeness_score >= 0.7", "scope_defined = true"],
          threshold: "0.7",
          outcomes: { yes: "Proceed to Phase B", no: "Request Clarification" },
          evidence: "Completeness score calculated at 0.85 based on NLP extraction."
        }
      ],
      output: ["problem_statement_v1"]
    },
    {
      id: "B",
      name: "Skill Extraction & Classification",
      input: ["problem_statement_v1", "skill_repository"],
      tasks: [
        "parse_code_AST",
        "apply_three_classification",
        "determine_granularity"
      ],
      decisionNodes: [
        {
          id: "B1",
          question: "Is granularity atomic?",
          rules: ["dependencies == 0", "single_responsibility == true"],
          threshold: "1.0",
          outcomes: { yes: "Proceed to Phase C", no: "Decompose Skill" },
          evidence: "AST analysis shows 0 external mutable state dependencies."
        }
      ],
      output: ["classified_skill_set", "operability_index"]
    },
    {
      id: "C",
      name: "Risk Assessment",
      input: ["classified_skill_set", "threat_models"],
      tasks: [
        "analyze_negative_intent",
        "evaluate_risk_level",
        "generate_safety_bounds"
      ],
      decisionNodes: [
        {
          id: "C1",
          question: "Is risk level acceptable?",
          rules: ["negative_intent < 20%", "risk_level in ['Low', 'Medium']"],
          threshold: "20%",
          outcomes: { yes: "Proceed to Phase D", no: "Halt Execution & Alert" },
          evidence: "Negative intent scored at 12% via heuristic scanning."
        }
      ],
      output: ["risk_report", "safety_bounds"]
    },
    {
      id: "D",
      name: "Execution Planning",
      input: ["classified_skill_set", "safety_bounds"],
      tasks: [
        "map_to_mpc_nodes",
        "schedule_tasks",
        "allocate_resources"
      ],
      decisionNodes: [
        {
          id: "D1",
          question: "Are resources available?",
          rules: ["mpc_nodes_ready >= required_nodes"],
          threshold: "100%",
          outcomes: { yes: "Proceed to Phase E", no: "Queue Task" },
          evidence: "5/5 required MPC nodes are currently idle and reserved."
        }
      ],
      output: ["execution_plan", "mpc_allocation"]
    },
    {
      id: "E",
      name: "MPC Execution",
      input: ["execution_plan", "mpc_allocation"],
      tasks: [
        "distribute_payload",
        "execute_secure_computation",
        "aggregate_results"
      ],
      decisionNodes: [
        {
          id: "E1",
          question: "Did computation succeed?",
          rules: ["error_rate == 0", "consensus_reached == true"],
          threshold: "100%",
          outcomes: { yes: "Proceed to Phase F", no: "Trigger Retry Protocol" },
          evidence: "All 5 nodes returned matching cryptographic hashes."
        }
      ],
      output: ["raw_results", "execution_logs"]
    },
    {
      id: "F",
      name: "Evaluation & Traceability",
      input: ["raw_results", "execution_logs"],
      tasks: [
        "format_output",
        "calculate_kpis",
        "generate_traceability_links"
      ],
      decisionNodes: [
        {
          id: "F1",
          question: "Are goals achieved?",
          rules: ["goal_achievement_rate >= 90%"],
          threshold: "90%",
          outcomes: { yes: "Finalize & Deliver", no: "Flag for Review" },
          evidence: "Output matches 98% of defined success criteria."
        }
      ],
      output: ["final_deliverable", "traceability_report"]
    }
  ]
};
