export interface GroupImage {
  id: string
  provider: string
  url: string
  thumbnail: string
  author: string
  attributionUrl: string
  width?: number
  height?: number
}

export interface ImageSearchOptions {
  query: string
  perPage?: number
  page?: number
}

export interface ImageProvider {
  readonly name: string
  search(options: ImageSearchOptions): Promise<GroupImage[]>
}
