// Initial paperboard rule set for the STE reference architecture.
// Intentionally UNAPPROVED until calibrated against physical samples / authoritative reference.
export const FBB_STANDARD_V1={
  id:'fbb-standard-v1',
  version:'0.1.0-unapproved',
  approvedBy:null,
  family:'paperboard',
  status:'UNAPPROVED',
  calibration:{source:'engineering-core-reference',factory:null,machine:null,notes:'Architecture reference only; requires benchmark calibration before production approval.'},
  formulas:{
    fold90:{op:'div_thickness',divisor:2},
    scoreToInside:{op:'div_thickness',divisor:2},
    scoreToOutside:{op:'div_thickness',divisor:2},
    glueFlapWidth:{op:'constant',value:15},
    tuckClearance:{op:'constant',value:1},
    dustClearance:{op:'constant',value:.75},
    panelOffset:{op:'constant',value:0},
    creaseOffset:{op:'div_thickness',divisor:2},
    receiverFlapDepthFactor:{op:'constant',value:.5},
    tuckDepthReduction:{op:'constant',value:1}
  },
  grain:{preferred_fold_relation:'across_grain',restriction:'parallel_or_180'}
};
