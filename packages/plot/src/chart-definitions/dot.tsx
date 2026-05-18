'use client'

import { CircleDot } from 'lucide-react'
import { suggestPlotChartTitle } from '../chart-title'
import {
  createCartesianPlotSelection,
  createPlotDataRequirements,
  createPlotPreviewConfig,
  createStandardPlotRenderer,
  needsMultipleTimePoints,
  supportsTimeChangeTransform,
} from './definition-helpers'
import { dotChartConfigurationSchema, dotSubType } from './dot.schema'
import { definePlotChart, tuple } from './core'

const dotAppearanceControls = tuple(
  'categoricalPalette',
  'legend',
  'cartesianOptions',
  'formatting',
  'colorOverrides',
)

export const dotChartDefinition = definePlotChart({
  key: dotSubType,
  type: 'plot',
  subType: dotSubType,
  label: 'Scatter',
  description: 'Value distribution',
  icon: CircleDot,
  schema: dotChartConfigurationSchema,
  getSuggestedTitle: suggestPlotChartTitle,
  getTypeOptionState: needsMultipleTimePoints,
  getDataRequirements: createPlotDataRequirements(),
  timeChange: supportsTimeChangeTransform({
    modes: tuple('delta', 'percentDelta'),
    defaultMode: 'none',
  }),
  renderer: { render: createStandardPlotRenderer() },
  selection: createCartesianPlotSelection(tuple('indicators', 'geometries')),
  appearanceControls: dotAppearanceControls,
  buildPreviewConfig: createPlotPreviewConfig(dotSubType),
})
