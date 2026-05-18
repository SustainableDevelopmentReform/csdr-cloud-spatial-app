'use client'

import { PieChart } from 'lucide-react'
import { suggestPlotChartTitle } from '../chart-title'
import {
  createPlotDataRequirements,
  createPlotPreviewConfig,
  createSingleDimensionPlotSelection,
  createStandardPlotRenderer,
} from './definition-helpers'
import { donutChartConfigurationSchema, donutSubType } from './donut.schema'
import { definePlotChart, tuple } from './core'

const donutAppearanceControls = tuple(
  'categoricalPalette',
  'legend',
  'donutOptions',
  'formatting',
  'colorOverrides',
)

export const donutChartDefinition = definePlotChart({
  key: donutSubType,
  type: 'plot',
  subType: donutSubType,
  label: 'Donut',
  description: 'Proportions',
  icon: PieChart,
  schema: donutChartConfigurationSchema,
  getSuggestedTitle: suggestPlotChartTitle,
  getDataRequirements: createPlotDataRequirements(),
  renderer: { render: createStandardPlotRenderer() },
  selection: createSingleDimensionPlotSelection(
    tuple('indicators', 'geometries', 'time'),
  ),
  appearanceControls: donutAppearanceControls,
  buildPreviewConfig: createPlotPreviewConfig(donutSubType),
})
