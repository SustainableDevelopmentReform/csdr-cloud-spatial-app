'use client'

import { ChartBarDecreasing } from 'lucide-react'
import { suggestPlotChartTitle } from '../chart-title'
import {
  createPlotDataRequirements,
  createPlotPreviewConfig,
  createSingleDimensionPlotSelection,
  createStandardPlotRenderer,
} from './definition-helpers'
import {
  rankedBarChartConfigurationSchema,
  rankedBarSubType,
} from './ranked-bar.schema'
import { definePlotChart, tuple } from './core'

const rankedBarAppearanceControls = tuple(
  'categoricalPalette',
  'legend',
  'cartesianOptions',
  'groupedBarOptions',
  'formatting',
  'colorOverrides',
)

export const rankedBarChartDefinition = definePlotChart({
  key: rankedBarSubType,
  type: 'plot',
  subType: rankedBarSubType,
  label: 'Ranked Bar',
  description: 'Sorted horizontal bars',
  icon: ChartBarDecreasing,
  schema: rankedBarChartConfigurationSchema,
  getSuggestedTitle: suggestPlotChartTitle,
  getDataRequirements: createPlotDataRequirements(),
  renderer: { render: createStandardPlotRenderer() },
  selection: createSingleDimensionPlotSelection(
    tuple('indicators', 'geometries', 'time'),
  ),
  appearanceControls: rankedBarAppearanceControls,
  buildPreviewConfig: createPlotPreviewConfig(rankedBarSubType),
})
