export type DesignStatus = 'released' | 'developing'

export interface Parameter {
  name: string
  annotation: string | null
  default: string | null
  required: boolean
}

export interface Design {
  id: string
  name: string
  platform: string
  material: string
  wavelength: string
  wavelengthNm: number | null
  mode: string
  crossSection: string
  deviceType: string
  variant: string[]
  version: string
  status: DesignStatus
  source: string
  line: number
  function: string
  parameters: Parameter[]
}

export interface Catalog {
  generatedAt: string
  source: string
  count: number
  designs: Design[]
}
