'use client'

import { TrendingUp } from 'lucide-react'
import { suggestPlotChartTitle } from '../chart-title'
import {
  createCartesianPlotSelection,
  createPlotDataRequirements,
  createPlotPreviewConfig,
  createStandardPlotRenderer,
  needsMultipleTimePoints,
  supportsTimeChangeTransform,
} from './definition-helpers'
import { lineChartConfigurationSchema, lineSubType } from './line.schema'
import { definePlotChart, tuple } from './core'

const lineAppearanceControls = tuple(
  'categoricalPalette',
  'legend',
  'cartesianOptions',
  'lineOptions',
  'formatting',
  'colorOverrides',
)

const lineTimeChange = supportsTimeChangeTransform({
  modes: tuple('delta', 'percentDelta'),
  defaultMode: 'none',
})

export const lineChartDefinition = definePlotChart({
  key: lineSubType,
  type: 'plot',
  subType: lineSubType,
  label: 'Line',
  description: 'Trends over time',
  icon: TrendingUp,
  schema: lineChartConfigurationSchema,
  getSuggestedTitle: suggestPlotChartTitle,
  getTypeOptionState: needsMultipleTimePoints,
  getDataRequirements: createPlotDataRequirements(),
  timeChange: lineTimeChange,
  renderer: {
    render: createStandardPlotRenderer({ timeChange: lineTimeChange }),
  },
  selection: createCartesianPlotSelection(tuple('indicators', 'geometries')),
  appearanceControls: lineAppearanceControls,
  buildPreviewConfig: createPlotPreviewConfig(lineSubType),
})
