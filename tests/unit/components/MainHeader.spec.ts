import { describe, expect, it } from 'vitest'
import MainHeader from '@/components/MainHeader.vue'

describe('MainHeader component', () => {
  it('exports a component definition', () => {
    expect(MainHeader).toBeTruthy()
    const component = MainHeader as { __name?: string; name?: string }
    expect(component.__name || component.name).toBeTruthy()
  })
})
