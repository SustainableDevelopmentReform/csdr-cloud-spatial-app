'use client'

import { Layers } from 'lucide-react'
import { suggestPlotChartTitle } from '../chart-title'
import {
  createCartesianPlotSelection,
  createPlotDataRequirements,
  createPlotPreviewConfig,
  createStandardPlotRenderer,
  needsMultipleTimePoints,
  supportsTimeChangeTransform,
} from './definition-helpers'
import {
  stackedAreaChartConfigurationSchema,
  stackedAreaSubType,
} from './stacked-area.schema'
import { definePlotChart, tuple } from './core'

const stackedAreaAppearanceControls = tuple(
  'categoricalPalette',
  'legend',
  'cartesianOptions',
  'lineOptions',
  'areaOptions',
  'formatting',
  'colorOverrides',
)

export const stackedAreaChartDefinition = definePlotChart({
  key: stackedAreaSubType,
  type: 'plot',
  subType: stackedAreaSubType,
  label: 'Stacked Area',
  description: 'Part-to-whole over time',
  icon: Layers,
  schema: stackedAreaChartConfigurationSchema,
  getSuggestedTitle: suggestPlotChartTitle,
  getTypeOptionState: needsMultipleTimePoints,
  getDataRequirements: createPlotDataRequirements(),
  timeChange: supportsTimeChangeTransform({
    modes: tuple('delta', 'percentDelta'),
    defaultMode: 'none',
  }),
  renderer: { render: createStandardPlotRenderer() },
  selection: createCartesianPlotSelection(tuple('indicators', 'geometries')),
  appearanceControls: stackedAreaAppearanceControls,
  buildPreviewConfig: createPlotPreviewConfig(stackedAreaSubType),
})
