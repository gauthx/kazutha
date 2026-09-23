# Kazutha Constitution

## Core Principles

### I. Separation of Concerns
UI rendering, business/domain logic, data-fetching, and control-flow orchestration
MUST live in distinct functions or modules. A single function MUST NOT mix
rendering with business rules, or business rules with the I/O that fetches their
inputs.

**Rationale**: Mixed concerns make a function's cohesion and coupling impossible
to judge in isolation, and make any single concern impossible to change without
touching the others.

### II. Justified Modularity
Every module, function, or abstraction MUST earn its existence: split code only
when there is a concrete reason (independent testability, reuse across call
sites, or a genuinely distinct responsibility) — never split for no reason, and
never let a single module grow responsibilities that can't be named in one
sentence.

**Rationale**: Unjustified splits and unjustified god-modules cost the same
thing: a reader can no longer predict what a change touches.

### III. Encapsulated State
Mutable state MUST be owned and encapsulated by the narrowest scope that needs
it. Global mutable state and global-scope variable pollution are prohibited;
module-scope constants (fixed strings, enums, configuration literals) are exempt
since they carry no mutable identity.

**Rationale**: Shared mutable state turns every caller into an implicit
dependency of every other caller.

### IV. Consistency
Naming conventions, formatting, structural patterns, and function-argument
ordering MUST be consistent within a file and across the codebase for equivalent
problems. A mix of naming styles (e.g. camelCase and snake_case) in the same
file, or two different patterns solving the same kind of problem in different
files, MUST be fixed rather than left as-is.

**Rationale**: Inconsistency forces every reader to re-derive local conventions
per file instead of transferring intuition from the rest of the codebase.

### V. Low Complexity
Functions MUST be kept to a reasonable cyclomatic complexity and MUST NOT be
fragmented into pieces that only exist to lower a complexity metric without
improving readability.

**Rationale**: Excess branching hide the actual behavior of
the code from the next reader.

### VI. Clear Module Structure
File and directory organization MUST reflect real logical boundaries in the
system, not incidental history. Module load order MUST be predictable, and
circular dependencies between modules are prohibited.

**Rationale**: Where code lives is itself a claim about the system's structure;
an organization that doesn't match that structure, or a dependency cycle that
makes load order unpredictable, actively misleads anyone navigating the
codebase.

**Version**: 1.0.0 | **Ratified**: 2026-09-22 | **Last Amended**: 2026-09-22
