# 觀明 (Guān Míng) — product concept

觀 *observe* + 明 *clarity*. Used as a symbol, not a name or a literal translation.

Visual style is inherited from Shape of Momentum: dark ground, minimal UI, calm, one long
flow instead of many screens.

## The reframe

It started as a diary. In use it became clear the value is not in the diary — it is in
helping a person see:

- what happened
- the story they told themselves about it
- whether another story could also be true

So the product is closer to a **reflection companion** than a journal app, and its core
unit is an **event**, not a diary entry. The app is an **archive of attention**: quick
captures — voice notes, thoughts, forwarded messages, quotes, context — that you return to
later.

## Capture first, reflect later

Do not make the person reflect at the moment something happens. First just collect events:
one button, one dictation, save, done.

> Someone cut me off on the road today and I was angry for an hour.

Later they come back to the event and can analyse it, reframe it, go deeper.

## The reflection

The full therapeutic protocol (event → negative reading → doubt → positive reading → plan,
plus happiness / self-respect / insight blocks) works, but it is too heavy for daily use —
even for the author. The shipped form is deliberately short:

- **Event reflection** — four questions (what stirred you, what it says about you, other
  perspectives, how you'll act next time), phrased for the event's resonance.
- **Day reflection** — events grouped by joy / upset / helped / made-harder, then what to
  change or keep, free insights, a day resonance.

The constant risk: digitising a therapeutic practice tends to lose the result, lose the
atmosphere, and turn the process into filling in a form. Every addition is weighed against
that.

## The self-respect finding

Unexpectedly, the strongest block was not event analysis or cognitive distortions — it was
self-respect:

- what today weakened me (acts I respect myself less for)
- what today strengthened me (acts I respect myself more for)

After a few days of this, you start repeating the second list and avoiding the first
without extra motivation. This is why entries carry a **kind** — *event* (happened to you)
vs *act* (something you did).

## Relationship with Shape of Momentum

Two related instruments, not separate products:

- **Shape of Momentum** — *what is the shape of this moment?* — looks outward, at the form
  of the event.
- **觀明** — *what do I actually think about this moment?* — looks inward, at the form of
  perception.

## Deep-link concept (aspirational)

Support the system share sheet: any content — a message, an email, a note, a reminder, a
task — can be forwarded into the app and becomes part of personal context.

## MVP hypothesis

Not a big diary. Not a CBT system. Not therapy. The simplest possible tool:

1. capture an event
2. return to it later
3. see it more clearly

Everything else can appear gradually.

## Open work

- Journal sync across devices (Google sign-in → Firebase Realtime Database, opt-in,
  local-first stays the default). Web Firebase `initializeApp` — which also revives web
  analytics — lands with it.
- System share intake on native.
