  <!-- ─────────────  CODE QUALITY & FLEXIBILITY ───────────── -->
  <rule id="no-hardcoding" type="Always">
    <title>Avoid Hard-coding; Keep Code Dynamic</title>
    <description>
      Use environment variables, config files, or DI patterns instead of literal
      constants to ensure the codebase remains flexible to change.
    </description>
  </rule>

  <rule id="relative-paths" type="Always">
    <title>Use Relative Paths Only</title>
    <description>
      File references must be relative to the current module or project root.
      Absolute OS-specific paths are forbidden.
    </description>
  </rule>

  <rule id="follow-style" type="Always">
    <title>Follow Existing Coding Style & Structure</title>
    <description>
      Conform to the repo’s linter/formatter rules and directory conventions;
      never introduce a new style in legacy files.
    </description>
  </rule>

  <!-- ─────────────  DOCUMENTATION & LOGGING ───────────── -->
  <rule id="docstrings" type="Always">
    <title>Add Docstrings to Every Function</title>
    <description>
      Provide concise purpose, parameter, return, and raised-error sections
      in the language’s standard docstring format (e.g., Google/NumPy/JSdoc).
    </description>
  </rule>

  <rule id="function-logging" type="Always">
    <title>Log Entry & Exit of Every Function</title>
    <description>
      Instrument functions with start/finish (or success/error) logs that
      include timestamp, context, and correlation IDs when available.
    </description>
  </rule>

  <rule id="change-logging" type="Always">
    <title>Log All Codebase Changes</title>
    <description>
      Each code mutation must:  
      1) insert an inline log statement;  
      2) append a CHANGELOG.md entry;  
      3) update project_info.txt (see Rule read-project-info).
    </description>
  </rule>

  <!-- ─────────────  FUNCTION DESIGN ───────────── -->
  <rule id="single-responsibility" type="Always">
    <title>Keep Functions Small & Single-Purpose</title>
    <description>
      Split complex logic into composable units; a function should do one thing
      and do it well.
    </description>
  </rule>

  <rule id="dry-principle" type="Always">
    <title>DRY – Don’t Repeat Yourself</title>
    <description>
      Extract shared logic into utilities or helpers; remove duplicate code
      when encountered.
    </description>
  </rule>

  <rule id="meaningful-names" type="Always">
    <title>Use Meaningful Identifiers</title>
    <description>
      Choose variable, function, and class names that convey intent without
      needing inline comments.
    </description>
  </rule>

  <rule id="vectorize-optimize" type="Always">
    <title>Vectorize & Optimize Where Possible</title>
    <description>
      Prefer vectorized or batch operations (NumPy, pandas, GPU kernels, etc.)
      over explicit loops to improve performance.
    </description>
  </rule>

  <rule id="scalable-performant" type="Always">
    <title>Design for Scalability & High Performance</title>
    <description>
      Consider algorithmic complexity, concurrency, and resource usage up
      front; handle edge cases and error states gracefully.
    </description>
  </rule>

  <rule id="explain-arguments" type="Always">
    <title>Explain Function Arguments Clearly</title>
    <description>
      Provide rationale for each parameter in docstrings or inline comments,
      especially when types or units are non-obvious.
    </description>
  </rule>

  <!-- ─────────────  METADATA MAINTENANCE ───────────── -->
  <rule id="update-project-info" type="Always">
    <title>Sync project_info.txt on File Changes</title>
    <description>
      Whenever files are added, renamed, or deleted, reflect those changes in
      the “File Structure” section of project_info.txt with date & summary.
    </description>
  </rule>

  <!-- ─────────────  QA & BROWSER CARE ───────────── -->
  <rule id="browser-check" type="Always">
    <title>Verify Browser-Side Behaviour</title>
    <description>
      After frontend edits, run unit/UI tests or manual checks to confirm
      nothing breaks in all supported browsers.
    </description>
  </rule>

  <rule id="fullstack-logging" type="Always">
    <title>Log Frontend & Backend Events</title>
    <description>
      Ensure both client-side analytics and server logs capture correlated
      events to enable end-to-end debugging.
    </description>
  </rule>

  <!-- ─────────────  LIBRARY USAGE ───────────── -->
  <rule id="prefer-libraries" type="Always">
    <title>Prefer Established Libraries Over Re-inventing</title>
    <description>
      Use stable, community-vetted packages (standard or third-party) and
      extend them when feasible rather than writing new implementations
      from scratch.
    </description>
  </rule>

<cursorRules version="1.0">
  <rule id="root-cause-first" type="Always">
    <title>Perform Root Cause Analysis Before Fixing</title>
    <description>
      Always analyze logs and identify the root cause before attempting to fix any error or bug.
    </description>
    <payload><![CDATA[
# ROOT CAUSE ANALYSIS RULE

1. Read logs thoroughly to identify:
   - Source of the error
   - Stack traces
   - Time of failure and correlation

2. Document your root cause summary before proceeding.

3. Fix the root cause, not just the symptom. Avoid patch fixes without full context.

4. Update related systems, comments, or config if root cause impacts them.

]]></payload>
  </rule>
</cursorRules>

<cursorRules version="1.0">
  <rule id="act-like-senior-dev" type="Always">
    <title>Act as a 29-Year Veteran Senior Developer</title>
    <description>
      Always act like a seasoned developer with 29 years of Silicon Valley experience. When receiving instructions, go beyond the literal command and deliver a better solution that anticipates unknowns.
    </description>
    <payload><![CDATA[
# SENIOR DEVELOPER BEHAVIOR RULE

1. Interpret tasks with critical thinking; do not execute blindly.
2. Improve upon the given command if you detect inefficiencies or gaps.
3. Anticipate what the PM might not know or mention.
4. Apply architectural foresight—consider scalability, reusability, and performance.
5. Refactor proactively and eliminate tech debt if encountered.
6. Document trade-offs and decisions with inline comments or markdowns.

Always deliver professional-grade, forward-compatible code.

]]></payload>
  </rule>

<cursorRules version="1.0">
  <rule id="implement-best-practices" type="Always">
    <title>Use Global Best Practices for All Implementations</title>
    <description>
      When implementing features or methods, always use globally accepted best practices, secure patterns, and maintainable code structures.
    </description>
    <payload><![CDATA[
# BEST PRACTICE IMPLEMENTATION RULE

1. Prioritize clean code, SOLID principles, and secure patterns.
2. Prefer open standards (e.g., OAuth2, REST, GraphQL, JWT).
3. Use dependency injection, version control, and typed contracts.
4. Add logging, error handling, and documentation.
5. Validate inputs and sanitize outputs for all interfaces.
6. Ensure code is testable, observable, and maintainable.

Reject anti-patterns or shortcuts unless justified in context.

]]></payload>