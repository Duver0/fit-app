declare module 'graphql-depth-limit' {
  import { ValidationContext, ASTVisitor } from 'graphql'

  interface DepthLimitOptions {
    ignore?: string | RegExp | ((fieldName: string) => boolean)
  }

  type DepthLimitCallback = (depths: Record<string, number>) => void

  function depthLimit(
    maxDepth: number,
    options?: DepthLimitOptions,
    callback?: DepthLimitCallback,
  ): (context: ValidationContext) => ASTVisitor

  export = depthLimit
}
