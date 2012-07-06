# fubar

Fubar is a CouchApp for scalable storage, exploration, and aggregation of log records, with a particular focus on errors. It has:

- an overview showing the activity of all applications
- standard log view showing a particular log in reverse chronological order
- a nicely formatted log detail page
- a logs-by-session report
- a logs-by-IP report
- a common errors report (showing common errors in the last 7 days, overall and by-application)

## Initial CouchDB Setup

1. Install [Couch DB 1.2][downloadcouch]
2. Go to [Futon][futon]
3. Add an admin user to Couch
4. Create an `errorlog` database

### Simple - for behind firewalls and proxies

This setup is appropriate when Fubar will not require strong security. This might be appropriate if:

- Fubar will only be accessible via `localhost`
- there will be IP restrictions in place
- a firewall or other authentication will in place

So on top of the basic CouchDB setup:

1. Install the Fubar CouchApp to `errorlog`. You can either:
    
    - Use the [CouchApp Command Line Tool][couchapp], OR
    - Replicate Fubar from an existing "master" installation
    
         {
           source : http://username:password@your-source.com.au/sourceapp,
           target : http://localhost:5984/errorlog,
           filter : errorlog/design
         }
         
2. Fubar should now be available by [browsing `errorlog`][logasapp].
3. Set up Fubar to log to `errorlog`, no username or password required.

### Secure - for public facing databases

This setup is appropriate when Fubar will be exposed on a public server. The gist of the setup is that the 
UI will be put in a lightly secured database, and the log itself in another strictly secured database. Thus
users can browse Fubar, but have to log in to access the data.

1. Create a database called `errorapp`
2. Edit `errorlog` and click "Security" - add your user to the list of admins AND users. You can also add 
less powerful users just to the users list.
3. Install the Fubar CouchApp to `errorapp`. You can either:
    
    - Use the [CouchApp Command Line Tool][couchapp], OR
    - Replicate Fubar from an existing "master" installation
    
         {
           source : http://username:password@your-source.com.au/sourceapp,
           target : http://localhost:5984/errorapp,
           filter : errorlog/design
         }
         
4. Fubar should now be available by [browsing `errorapp`][separateapp].
5. Open Fubar and log in as an admin.
6. Go to the Configuration page, and update the Log Database to `errorlog`
7. Set up Fubar to log to `errorlog`, using the credentials for any user in the users list

### Extra Credit

#### Increasing login session length

1. Go to the Futon [Configuration][futonconfig] section
2. Edit the `couch_httpd_auth` timeout value.

#### Database Compaction

The normal running of Couch can cause a lot of redundant data to build up - particularly after adding new documents.

1. Go to the Futon [Configuration][futonconfig] section
2. Scroll to the bottom of the page and click "Add a new section".
3. section: `compactions`, option: `\_default`, value: `[{db_fragmentation, "70%"}, {view_fragmentation, "60%"}, {from, "23:00"}, {to, "04:00"}]`

For more information about compaction options: [Compaction][compaction].

### Apache Proxy

The following can be set up to proxy Couch DB requests through an Apache Virtual:

	LoadModule  proxy_module         modules/mod_proxy.so
	LoadModule  proxy_http_module    modules/mod_proxy_http.so
	LoadModule  headers_module       modules/mod_headers.so
	LoadModule  deflate_module       modules/mod_deflate.so
	
	ProxyRequests off
	
	<Location />
		ProxyPass http://localhost:5984/
        ProxyPassReverse /
	</Location>

This also makes it easy to add IP restrictions. Note that you can also add rewrite rules, but be careful that they don't interfere with the paths Couch expects.

## logging

Logs are POSTed to the couch database (usually `errorlog`) as JSON objects. Except where excepted below, they are all strings. Required fields are:

- **application**
- **logtype**: logs in Fubar are almost always grouped by this value
- **datetime**: this should be a string parsable by JavaScript; we use `mmmm, dd yyyy HH:mm:ss`

Optional fields that are displayed automatically are:

- **machinename**: the server
- **instancename**: for cases where one server has multiple engine instances
- **sessionid**: if this is available Fubar will link this to a view showing all logs for that session 
- **message**: if this is available (**error** logtype only) Fubar will link this to the application summary page, which shows how many of this error have occurred recently
- **browser**: the user agent
- **host**
- **httpreferer**
- **scriptname** & **querystring**: if these are available they will be displayed together as a link
- **remoteaddress**: user's IP address; if this is available Fubar will link this value to a view showing all logs for that IP
- **bot**: a string showing whether the application thought the user was a bot
- **version**: an object; the `string` key will be displayed
- **farcry**: an object; the `string` key will be displayed
- **engine**: an object; the `string` key will be displayed

### logtype

Is used to group all logs displayed by Fubar, and is used as a hook for customising the log summary and detail templates. Fubar currently has templates for these logtypes:

#### error

This logtype has an extra report in Fubar (Common Errors, which groups errors by **message**) that the others do not. The following extra fields are also displayed if available:

- **type**: aka Exception Type
- **detail**
- **extended_info**
- **queryError**
- **sql**
- **where**
- **stack**: an array of template, line, location objects (if location == "project" then that stack line is emphasised)
- **url**: aka Post-process URL (an object) - for cases where the URL as the application sees it is not the same as scriptname?querystring

#### 404

- **url**: aka Post-process URL (an object) - for cases where the URL as the application sees it is not the same as scriptname?querystring

#### types / rules

These logtypes were added for [FarCry][farcry] CRUD logs.

- **event**
- **userid**
- **object**: the id of the object in question
- **objecttype**
- **notes**

#### security

- **event**
- **userid**
- **notes**

#### default

Yes, there is a default detail view. Log types that don't have a custom detail view simply display all the non-standard keys in the log record.
Keep in mind that it is limited to what JavaScript's `toString` function can do.

[downloadcouch]: http://couchdb.apache.org/#download
[futon]: http://127.0.0.1/_utils/
[couchapp]: http://couchapp.org
[logasapp]: http://127.0.0.1/errorlog/_design/errorlog/index.html
[separateapp]: http://127.0.0.1/errorapp/_design/errorlog/index.html
[futonconfig]: http://127.0.0.1/_utils/config.html
[compaction]: http://wiki.apache.org/couchdb/Compaction/
[farcry]: http://www.farcrycore.org/