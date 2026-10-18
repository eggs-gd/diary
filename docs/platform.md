# Platform strategy

The PWA is the reference implementation. Native builds add platform integration, and every
native capability has a web fallback so the PWA is never behind.

| Capability     | Native                                  | Web / PWA fallback               |
| -------------- | --------------------------------------- | -------------------------------- |
| Storage        | SQLite (`@capacitor-community/sqlite`)  | `localStorage`                   |
| Analytics      | `@capacitor-firebase/analytics`         | `firebase/analytics`             |
| Export / share | System share sheet                      | in-app preview → download / copy |
| Text size      | Dynamic Type via `@capacitor/text-zoom` | browser zoom                     |
| Share intake   | System share target                     | —                                |

When adding a feature: make it work on the PWA first, then layer the native path on top.
