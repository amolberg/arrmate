# Contributing to Arrmate

Thanks for helping build a calmer, safer control plane for self-hosted media stacks.

## Before opening a change

- Read `README.md`, `SECURITY.md`, and `NEXT_PROMPT.md`.
- Keep the change focused and explain the user-facing behavior.
- Never include service credentials, personal media metadata, private URLs, screenshots, logs, or database exports.
- If the change touches an integration, document the upstream API behavior and the disconnected/error state.
- If the change touches authorization or destructive actions, include tests for both allowed and denied roles.

## Development expectations

- Use the repository's committed package manager and scripts once the application foundation is present.
- Run formatting, lint, typecheck, unit tests, and relevant browser tests before submitting.
- Prefer small commits with descriptive messages.
- Avoid adding a dependency when a small typed utility is clearer and safer.
- Keep mobile behavior intentional at a 360px viewport and check keyboard/focus behavior.
- Support reduced motion and accessible labels for interactive controls.

## Pull requests

Describe:

1. What changed and why.
2. Which roles and screens are affected.
3. How external service failure is represented.
4. Which commands were run and their real results.
5. Any migration, deployment, backup, or security implications.

Do not claim a live integration was tested unless it was tested against a real authorized local service. Fixtures and mocks must be labeled as such.

## Scope

Arrmate is independent software and is not affiliated with the services it integrates. Contributions must respect the licenses and terms of those services and the laws applicable to the operator.

## Code of conduct

By participating, you agree to follow `CODE_OF_CONDUCT.md`.

## License

Contributions are made under the MIT License in `LICENSE` unless a contribution states otherwise and the maintainers accept it.

## Maintainer note

The project is at foundation stage. Product boundaries and adapter contracts are intentionally more important than adding a long list of integrations quickly.

Keep the first releases trustworthy. A boring honest error state beats a flashy fake success state.

## End

Questions that materially change the product boundary should be raised before implementation rather than hidden in a large pull request.

Thank you for contributing to Arrmate.

## Final checklist

- [ ] No secrets or private data are present.
- [ ] Authorization is enforced server-side.
- [ ] Destructive actions are explicit and audited.
- [ ] External failures have honest UI states.
- [ ] Tests cover the changed behavior.
- [ ] Documentation is updated.
- [ ] Git diff is focused.

## Repository hygiene

Do not commit `.env`, generated media, downloaded torrents, database dumps, screenshots containing private data, or local agent state. The repository ignore file is intentionally strict; do not weaken it to make a local build convenient.

## Reporting bugs

Use a private report for security issues. See `SECURITY.md` rather than opening a public issue with credentials or exploit details.

## Versioning

There is no release contract yet. Avoid creating public compatibility promises until the first working vertical slice and deployment documentation exist.

## Thank you

Build it with sweat, care, and a little less dashboard chaos.
