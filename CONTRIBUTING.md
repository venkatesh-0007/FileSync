# Contributing to FileSync

First off, thank you for considering contributing to FileSync! It's people like you that make open source such a great community.

## Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check our [Issues](https://github.com/your-username/filesync/issues) to see if someone else has already created a ticket. If not, go ahead and [make one](https://github.com/your-username/filesync/issues/new/choose)!

## Fork & create a branch

If this is something you think you can fix, then fork FileSync and create a branch with a descriptive name.

A good branch name would be (where issue #325 is the ticket you're working on):

```sh
git checkout -b 325-add-file-preview
```

## Setup environment

1. Clone your fork locally.
2. Install dependencies: `npm install`
3. Setup `.env.local` by following the setup instructions in the `README.md`.
4. Run the development server: `npm run dev`

## Make a pull request

When you're finished with your changes, create a pull request, also known as a PR.
- Fill out the PR template so that we can review your PR. This template helps reviewers understand your changes as well as the purpose of your pull request. 
- Don't forget to link PR to issue if you are solving one.
- Enable the checkbox to allow maintainer edits so the branch can be updated for a merge.
- Once you submit your PR, a team member will review your proposal. We may ask questions or request additional information.

## Code Style

- We use `eslint` for linting.
- Make sure to run `npm run lint` and fix any issues before submitting your PR.
