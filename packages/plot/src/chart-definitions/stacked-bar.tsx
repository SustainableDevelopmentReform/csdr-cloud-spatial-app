'use client'

import { BarChart3 } from 'lucide-react'
import { suggestPlotChartTitle } from '../chart-title'
import {
  createCartesianPlotSelection,
  createPlotDataRequirements,
  createPlotPreviewConfig,
  createStandardPlotRenderer,
  needsMultipleTimePoints,
} from './definition-helpers'
import {
  stackedBarChartConfigurationSchema,
  stackedBarSubType,
} from './stacked-bar.schema'
import { definePlotChart, tuple } from './core'

const stackedBarAppearanceControls = tuple(
  'categoricalPalette',
  'legend',
  'cartesianOptions',
  'formatting',
  'colorOverrides',
)

export const stackedBarChartDefinition = definePlotChart({
  key: stackedBarSubType,
  type: 'plot',
  subType: stackedBarSubType,
  label: 'Stacked Bar',
  description: 'Totals by category',
  icon: BarChart3,
  schema: stackedBarChartConfigurationSchema,
  getSuggestedTitle: suggestPlotChartTitle,
  getTypeOptionState: needsMultipleTimePoints,
  getDataRequirements: createPlotDataRequirements(),
  renderer: { render: createStandardPlotRenderer() },
  selection: createCartesianPlotSelection(tuple('indicators', 'geometries')),
  appearanceControls: stackedBarAppearanceControls,
  buildPreviewConfig: createPlotPreviewConfig(stackedBarSubType),
})
