'use client'

import { AreaChart } from 'lucide-react'
import { suggestPlotChartTitle } from '../chart-title'
import {
  createCartesianPlotSelection,
  createPlotDataRequirements,
  createPlotPreviewConfig,
  createStandardPlotRenderer,
  needsMultipleTimePoints,
  supportsTimeChangeTransform,
} from './definition-helpers'
import { areaChartConfigurationSchema, areaSubType } from './area.schema'
import { definePlotChart, tuple } from './core'

const areaAppearanceControls = tuple(
  'categoricalPalette',
  'legend',
  'cartesianOptions',
  'lineOptions',
  'areaOptions',
  'formatting',
  'colorOverrides',
)

export const areaChartDefinition = definePlotChart({
  key: areaSubType,
  type: 'plot',
  subType: areaSubType,
  label: 'Area',
  description: 'Filled trends',
  icon: AreaChart,
  schema: areaChartConfigurationSchema,
  getSuggestedTitle: suggestPlotChartTitle,
  getTypeOptionState: needsMultipleTimePoints,
  getDataRequirements: createPlotDataRequirements(),
  timeChange: supportsTimeChangeTransform({
    modes: tuple('delta', 'percentDelta'),
    defaultMode: 'none',
  }),
  renderer: { render: createStandardPlotRenderer() },
  selection: createCartesianPlotSelection(tuple('indicators', 'geometries')),
  appearanceControls: areaAppearanceControls,
  buildPreviewConfig: createPlotPreviewConfig(areaSubType),
})
