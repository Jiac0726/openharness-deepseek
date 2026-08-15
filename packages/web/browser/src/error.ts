/** Errors exposed by the interactive browser capability. */

import { HarnessError } from '@deepseek-ai/dsh-llm'

/** Typed browser failure with a machine-routable open-string code. */
export class BrowserError extends HarnessError {}
