# behemoth
I get reeeeeeally freaking tired of writing the same boilerplate code over and over again, so basically this helps me with that. It's called `behemoth` because it's a big boi, and it generates a SvelteKit project with all the things I like to use, like TypeScript, TailwindCSS, Prettier, and more :)

Basic logical structure:

behemoth
└── frontend:
	└──  framework: [SvelteKit](https://kit.svelte.dev)
	└──  css: [TailwindCSS](https://tailwindcss.com)
	└── auth: basic [Supabase auth](https://supabase.com/docs/guides/auth), for now
└── backend:
	└──  data: [Supabase](https://supabase.com/)
		└──  Database: Supabase [Postgres database](https://supabase.com/docs/guides/database)
		└──  Realtime: Supabase [Realtime server](https://supabase.com/docs/guides/realtime)
	└──  languages:
		└──  [Node.JS](https://nodejs.org/en/) (TypeScript), for now
		└──  [GoLang](https://go.dev/), for some cases
	└──  storage:
		└──  [Supabase Storage](https://supabase.com/docs/guides/storage), for now
		└──  [AWS buckets](https://aws.amazon.com/s3/), for some cases
	└──  email:
		└──  [Resend](https://resend.com) 
		└── Email Templates
└── ci/cd:
    └── [Render](https://render.com), for now

behemoth
- frontend:
	- framework: [SvelteKit](https://kit.svelte.dev)
	- css: [TailwindCSS](https://tailwindcss.com)
	-  auth: basic [Supabase auth](https://supabase.com/docs/guides/auth), for now
- backend:
	- data:
		- Database: Supabase [Postgres database](https://supabase.com/docs/guides/database)
		- Realtime: Supabase [Realtime server](https://supabase.com/docs/guides/realtime)
	- languages:
		- [Node.JS](https://nodejs.org/en/) (TypeScript), for now
		- [GoLang](https://go.dev/), for some cases
## Frontend
### Framework: SvelteKit 
Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

#### Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
bun x sv@0.16.5 create --template minimal --types ts --add prettier tailwindcss="plugins:typography,forms" --install bun behemoth
```

#### Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

#### Building

To create a production version:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy, install [adapter](https://svelte.dev/docs/kit/adapters) for your Render.

### CSS: TailwindCSS
If you've followed the steps above, you should have TailwindCSS installed and configured. You can start using it in your Svelte components right away.

### Auth: Supabase

## Backend

### Database
### Language

## DevOps + CI/CD
