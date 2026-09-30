interface Window {
  Alpine: import('alpinejs').Alpine;
}

declare namespace ot {
  function toast(text: string, title?: string, options?: Partial<{
    variant: 'success'|'danger'|'warning',
    position: string,
    duration: number
  }>)
}
