'use client'

import { BarChart } from 'lucide-react'
import { suggestPlotChartTitle } from '../chart-title'
import {
  createCartesianPlotSelection,
  createPlotDataRequirements,
  createPlotPreviewConfig,
  createStandardPlotRenderer,
  supportsTimeChangeTransform,
} from './definition-helpers'
import {
  groupedBarChartConfigurationSchema,
  groupedBarSubType,
} from './grouped-bar.schema'
import { definePlotChart, tuple } from './core'

const groupedBarAppearanceControls = tuple(
  'categoricalPalette',
  'legend',
  'cartesianOptions',
  'groupedBarOptions',
  'formatting',
  'colorOverrides',
)

const groupedBarTimeChange = supportsTimeChangeTransform({
  modes: tuple('delta', 'percentDelta'),
  defaultMode: 'none',
})

export const groupedBarChartDefinition = definePlotChart({
  key: groupedBarSubType,
  type: 'plot',
  subType: groupedBarSubType,
  label: 'Grouped Bar',
  description: 'Side-by-side comparison',
  icon: BarChart,
  schema: groupedBarChartConfigurationSchema,
  getSuggestedTitle: suggestPlotChartTitle,
  getDataRequirements: createPlotDataRequirements(),
  timeChange: groupedBarTimeChange,
  renderer: {
    render: createStandardPlotRenderer({ timeChange: groupedBarTimeChange }),
  },
  selection: createCartesianPlotSelection(tuple('indicators', 'geometries')),
  appearanceControls: groupedBarAppearanceControls,
  buildPreviewConfig: createPlotPreviewConfig(groupedBarSubType),
})
