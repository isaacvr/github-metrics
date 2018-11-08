# Metrics generator for github
## Installation

Install all the dependencies using npm:

```js
  npm install request chalk commander querystring glob
```

Then create in the project's folder, a file called `auth.js` with the content:

```javascript

exports.client_id = '<my-client-id>';
exports.client_secret = '<my-client-secret>';

```

If you don't have any of these things, use the next configuration:

```javascript

exports.client_id = -1;
exports.client_secret = -1;

```

If the configuration is different that before, there will be an unexpected behaviour.

## Usage

Open the terminal at the project folder and type:

```bash
  $ node metrics.js -o $owner -r $repo -p $proxy
```

Then run a static server at the same folder. For example:

```bash
  $ python -m SimpleHTTPServer 4000
```

or:
```bash
  $ http-server -p 4000
```

Then open your browser at [http://localhost:4000](http://localhost:4000)

All the parameters are:
* $owner: The owner of the project
* $repo: The name of the repository
* $proxy: Proxy settings `http://password:username@host:port`

**$proxy is the only optional parameter**