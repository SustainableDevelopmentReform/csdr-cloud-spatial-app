import React from 'react'
import DeckGL from '@deck.gl/react'
import { Map } from '@vis.gl/react-maplibre'
import { COGLayer } from '@developmentseed/deck.gl-geotiff'

// See example here: https://developmentseed.org/deck.gl-raster/examples/land-cover/

export const DatasetRunMapCog: React.FC = () => {
  // const COG_URL = 'https://e84-earth-search-sentinel-data.s3.us-west-2.amazonaws.com/sentinel-2-pre-c1-l2a/32/T/LR/2022/11/S2B_T32TLR_20221125T103254_L2A/B04.tif';
  // const COG_URL = "https://s3.us-east-1.amazonaws.com/ds-deck.gl-raster-public/cog/Annual_NLCD_LndCov_2024_CU_C1V1.tif"
  // const COG_URL = "https://data.source.coop/ausantarctic/ghrsst-mur-v2/2002/06/01/20020601090000-JPL-L4_GHRSST-SSTfnd-MUR-GLOB-v02.0-fv04.1_analysed_sst.tif"
  // const COG_URL = "https://data.source.coop/tge-labs/aef/v1/annual/2024/12N/x03l2pi8jf4om2szj-0000000000-0000000000.tiff"
  // const COG_URL = "https://ai4edataeuwest.blob.core.windows.net/usgs-gap/conus/gap_landfire_nationalterrestrialecosystems2011_-861135_1762215_-561135_1462215.tif"
  // This works if CORS is enabled:
  const COG_URL =
    'https://s3.us-east-1.amazonaws.com/ds-deck.gl-raster-public/cog/Annual_NLCD_LndCov_2024_CU_C1V1.tif'
  const cogLayer = new COGLayer({
    id: 'cog-layer',
    geotiff: COG_URL,
  })
  return (
    <div>
      COG Test (Cloud Optimized GeoTIFF)
      <div style={{ height: '500px', width: '100%', position: 'relative' }}>
        <DeckGL
          initialViewState={{ longitude: 0, latitude: 0, zoom: 1 }}
          controller={true}
          layers={[cogLayer]}
        >
          <Map
            style={{ width: '100%', height: '100%' }}
            mapStyle="https://api.protomaps.com/styles/v5/white/en.json?key=51cf1275231eb004"
          />
        </DeckGL>
      </div>
    </div>
  )
}
