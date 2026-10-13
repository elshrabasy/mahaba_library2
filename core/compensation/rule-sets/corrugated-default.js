// Behavior-preserving extraction of the current EVC11001 compensation rules.
// Values are intentionally unchanged from the pilot. Approval/calibration comes later.

export const CORRUGATED_DEFAULT_RULE_SET={
  id:'corrugated-default',
  version:'0.2.0-unapproved',
  approvedBy:null,
  family:'corrugated',
  status:'UNAPPROVED',
  calibration:{source:'legacy-pilot',factory:null,machine:null},
  formulas:{
    fold90:{op:'mul_thickness',factor:.5},
    lastPanelCorrection:{op:'mul_thickness',factor:1},
    glueFlapCorrection:{op:'constant',value:0},
    glueFlapWidth:{op:'constant',value:25},
    glueFlapAngleDeg:{op:'constant',value:65},
    slotWidth:{op:'mul_thickness',factor:2},
    slotExtension:{op:'constant',value:2},
    tuckCorrection:{op:'mul_thickness',factor:1},
    lidClearance:{op:'constant',value:1},
    slitDepth:{op:'mul_thickness',factor:.5},
    dustFlapCorrection:{op:'mul_thickness',factor:1.5},
    reliefRadius:{op:'thickness_plus',value:2},
    reliefOffset:{op:'constant',value:1},
    handleCorrection:{op:'mul_thickness',factor:1},
    outsideFold90:{op:'mul_thickness',factor:.5},
    doubleCrease:{op:'mul_thickness',factor:2},
    lidFrontCorrection:{op:'mul_thickness',factor:1/3},
    layerStep:{op:'mul_thickness',factor:1},
    insideLayer:{op:'mul_thickness',factor:1},
    rimFold90:{op:'mul_thickness',factor:1.5},
    rimHeightCorrection:{op:'mul_thickness',factor:-1/3},
    rimCreaseGap:{op:'mul_thickness',factor:1},
    fittingCreaseGap:{op:'mul_thickness',factor:1}
  },
  fluteCrease:{along:1,across:1}
};
