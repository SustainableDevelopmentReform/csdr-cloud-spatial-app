import {
  isConstantNode,
  isFunctionNode,
  isOperatorNode,
  isSymbolNode,
  parse,
  type MathNode,
} from 'mathjs'

export const derivedExpressionLimits = {
  maxExpressionLength: 500,
  maxNodeCount: 100,
  maxDepth: 20,
  maxFunctionArgs: 4,
}

export const allowedDerivedExpressionOperators: readonly string[] = [
  '+',
  '-',
  '*',
  '/',
  '^',
]

export const allowedDerivedExpressionFunctions: readonly string[] = [
  'abs',
  'ceil',
  'exp',
  'floor',
  'log',
  'log10',
  'max',
  'min',
  'round',
  'sqrt',
]

const allowedOperators = new Set(allowedDerivedExpressionOperators)
const allowedFunctions = new Set(allowedDerivedExpressionFunctions)

const countNodes = (node: MathNode): number => {
  let count = 1

  node.forEach((child) => {
    count += countNodes(child)
  })

  return count
}

const getDepth = (node: MathNode): number => {
  let depth = 1

  node.forEach((child) => {
    depth = Math.max(depth, getDepth(child) + 1)
  })

  return depth
}

const getFunctionName = (node: MathNode): string | null => {
  if (isSymbolNode(node)) {
    return node.name
  }

  return null
}

export const buildAllowedDerivedExpressionSymbols = (
  indicatorIds: readonly string[],
): Set<string> => new Set(indicatorIds.map((_, index) => `$${index + 1}`))

export const validateDerivedExpression = (options: {
  expression: string
  allowedSymbols: Set<string>
}): string | null => {
  const expression = options.expression.trim()

  if (expression.length === 0) {
    return 'Expression is required.'
  }

  if (expression.length > derivedExpressionLimits.maxExpressionLength) {
    return `Expression must be ${derivedExpressionLimits.maxExpressionLength} characters or fewer.`
  }

  let parsed: MathNode

  try {
    parsed = parse(expression)
  } catch (error) {
    return error instanceof Error ? error.message : 'Expression is invalid.'
  }

  if (countNodes(parsed) > derivedExpressionLimits.maxNodeCount) {
    return `Expression must contain ${derivedExpressionLimits.maxNodeCount} AST nodes or fewer.`
  }

  if (getDepth(parsed) > derivedExpressionLimits.maxDepth) {
    return `Expression depth must be ${derivedExpressionLimits.maxDepth} or less.`
  }

  let failure: string | null = null

  parsed.traverse((node, _path, parent) => {
    if (failure) {
      return
    }

    if (isOperatorNode(node)) {
      if (!allowedOperators.has(node.op)) {
        failure = `Operator "${node.op}" is not allowed.`
      }
      return
    }

    if (isSymbolNode(node)) {
      if (isFunctionNode(parent) && parent.fn === node) {
        return
      }

      if (!options.allowedSymbols.has(node.name)) {
        failure = `Variable "${node.name}" is not allowed.`
      }
      return
    }

    if (isConstantNode(node)) {
      if (typeof node.value !== 'number') {
        failure = 'Only numeric constants are allowed.'
      }
      return
    }

    if (isFunctionNode(node)) {
      const functionName = getFunctionName(node.fn)

      if (!functionName || !allowedFunctions.has(functionName)) {
        failure = 'Function is not allowed.'
        return
      }

      if (node.args.length > derivedExpressionLimits.maxFunctionArgs) {
        failure = `Functions can take at most ${derivedExpressionLimits.maxFunctionArgs} arguments.`
      }
      return
    }

    if (node.type === 'ParenthesisNode') {
      return
    }

    failure = `${node.type} is not allowed in derived indicator expressions.`
  })

  return failure
}

export const validateDerivedExpressionForIndicators = (options: {
  expression: string | undefined
  indicatorIds: readonly string[]
}): string | null =>
  validateDerivedExpression({
    expression: options.expression ?? '',
    allowedSymbols: buildAllowedDerivedExpressionSymbols(options.indicatorIds),
  })
