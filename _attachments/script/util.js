(function(){
    var path = unescape(document.location.pathname).split('/');
    var qs = document.location.search.slice(1).split("&");
    var url = {};
    for (var i=0; i<qs.length; i++) url[qs[i].split("=")[0]] = decodeURIComponent(qs[i].split("=")[1]);
    
    window.util = {
        rootpath : "/" + path[1] + "/" + path[2] + "/" + path[3] + "/",
        design : path[3],
        dbname : path[1],
		appname : path[1],
        db : $.couch.db(path[1]),
		appdb : $.couch.db(path[1]),
        url : url,
		
		standardproperties : [
			"_id",
			"_rev",
			"logtype",
			"application",
			"machinename",
			"instancename",
			"sessionid",
			"message",
			"browser",
			"datetime",
			"host",
			"httpreferer",
			"scriptname",
			"querystring",
			"remoteaddress",
			"bot",
			"version",
			"farcry",
			"engine",
			"datetimeorderable",
			"valarray"
		],
		
		sessionready : false,
		
		changesfns : [],
		
        deferredView : function(view,options){
            var deferredResult = $.Deferred(), db = util.db;
            
            options = options || {};
            options.success = function(data){
                deferredResult.resolve(data);
            };
            options.error = function(jqXHR, textStatus, errorThrown){
                deferredResult.reject(new Error(errorThrown));
            };
            
            if (options.db){
                db = options.db;
                delete options.db;
            }
            
            db.view(util.design + "/" + view, options);
            
            return deferredResult.promise();
        },
        
        deferredGet : function(id,options){
            var deferredResult = $.Deferred(), db = util.db;
            
            options = options || {};
            options.success = function(data){
                deferredResult.resolve(data);
            };
            options.error = function(jqXHR, textStatus, errorThrown){
                deferredResult.reject(new Error(errorThrown));
            };
            
            if (options.db){
                db = options.db;
                delete options.db;
            }
            
            db.openDoc(id, options);
            
            return deferredResult.promise();
        },
        
        deferredSave : function(data,options){
            var deferredResult = $.Deferred(), db = util.db;
            
            options = options || {};
            options.success = function(data){
                deferredResult.resolve(data);
            };
            options.error = function(jqXHR, textStatus, errorThrown){
                deferredResult.reject(new Error(errorThrown));
            };
            
            if (options.db){
                db = options.db;
                delete options.db;
            }
            
            db.saveDoc(data, options);
            
            return deferredResult.promise();
        },
        
        deferredRemove : function(data,options){
            var deferredResult = $.Deferred(), db = util.db;
            
            options = options || {};
            options.success = function(data){
                deferredResult.resolve(data);
            };
            options.error = function(jqXHR, textStatus, errorThrown){
                deferredResult.reject(new Error(errorThrown));
            };
            
            if (options.db){
                db = options.db;
                delete options.db;
            }
            
            db.removeDoc(data, options);
            
            return deferredResult.promise();
        },
        
        deferredAll : function(options){
            var deferredResult = $.Deferred(), db = util.db, resolve = false, count = 0, result = [], newdata;
            
            options = options || {};
            options.success = function(data){
                if (resolve){
                    count = data.rows.length;
                    
                    for (var i=0; i<data.rows.length; i++){
                        newdata = util.deferredGet(data.rows[i].id,{ db:db });
                        newdata.done(function(data){
                            count -= 1;
                            result.push(data);
                            if (count == 0) deferredResult.resolve(result);
                        });
                        newdata.fail(function(err){
                            deferredResult.reject(err);
                        });
                    }
                }
                else {
                    deferredResult.resolve(data);
                }
            };
            options.error = function(jqXHR, textStatus, errorThrown){
                deferredResult.reject(new Error(errorThrown));
            };
            
            if (options.db){
                db = options.db;
                delete options.db;
            }
            
            if (options.resolve){
                resolve = options.resolve;
                delete options.resolve;
            }
            
            db.allDocs(options);
            
            return deferredResult.promise();
        },
        
		deferredConfig : function(){
			var deferredResult = $.Deferred(); deferredGet = util.deferredGet("config");
			
			deferredGet.done(function(data){
				deferredResult.resolve(data);
			});
			deferredGet.fail(function(){
				var defconfig = {
					_id : "config",
					db : util.dbname
				};
				var deferredSave = util.deferredSave(defconfig);
				
				deferredSave.done(function(doc){
					defconfig._rev = doc._rev;
					deferredResult.resolve(defconfig);
				});
				deferredSave.fail(function(err){
					deferredResult.reject(err);
				});
			});
			
			return deferredResult.promise();
		},
		
		deferredDBs : function(){
            var deferredResult = $.Deferred();
            
            options = {};
            options.success = function(data){
                deferredResult.resolve(data);
            };
            options.error = function(jqXHR, textStatus, errorThrown){
                deferredResult.reject(new Error(errorThrown));
            };
            
            $.couch.allDbs(options);
            
            return deferredResult.promise();
		},
		
        pad2 : function(number) {
            return (number < 10 ? '0' : '') + number
        },
        
        hourRange : function(start,end){
            var range = [], nextdate = start;
            
            while (nextdate <= end){
                range.push([
                    nextdate.getFullYear().toString(),
                    "-",
                    util.pad2(nextdate.getMonth()+1),
                    "-",
                    util.pad2(nextdate.getDate()),
                    " ",
                    util.pad2(nextdate.getHours()+1)
                ].join(""));
                nextdate = new Date(nextdate - 0 + 60 * 60 * 1000);
            }
            
            return range;
        },
        
        changesRunning : false,
        
        setupChanges : function(since,options) {
            if (!util.changesRunning) {
                options = options || {};
                if (options.filter) options.filter = util.design + "/" + options.filter;
                
                util.changeHandler = util.db.changes(since,options);
                util.changesRunning = true;
				
				for (var i=0; i<util.changesfns.length; i++)
					util.changeHandler.onChange(util.changesfns[i])
			}
        },
		
		stopChanges : function(){
			util.changesRunning = false;
			if (util.changeHandler) {
				util.changeHandler.stop();
				delete util.changeHandler;
			}
		},
		
		onChanges : function(callback){
			if (util.changesHandler)
				util.changesHandler.onChange(callback);
			util.changesfns.push(callback);
		},
        
        onSessionReady : function(callback){
			if (util.sessionready)
				callback();
			else
				$(document).bind("sessionReady",callback);
        },
        
        renderError : function(err){
			if ($("#error .alert").length) {
				if (err) 
					$("#error .alert").append("<br>"+err.toString());
				else 
					$("#error").html("");
			}
			else if (err){
				$("#error").renderTemplate("fragment/error", { error: err.toString()	},function(){
					this.find(".alert").alert();
				});	
			}
			
			$(".empty-content").remove();
        },
			
		templates : {},
		
   		getTemplate : function(template){
	        if (!util.templates[template]){
	            if ($("#" + template + "-template").length) 
					util.templates[template] = $.when($("#" + template + "-template").text());
				else {
					util.templates[template] = $.Deferred();
					var getResult = $.get(util.rootpath + "templates/" + template + ".html").pipe(function(html){
						return $.when(html)
					});
					getResult.done(function(html){
						util.templates[template].resolve(html);
					});
					getResult.fail(function(err){
						util.templates[template].resolve("");
					});
				}
	        }
	        
	        return util.templates[template];
	    },
		
		sparkline : function(data,width,height){
			var total = 0;
			
			if (typeof(data) == "string")
				total = data.split(",").map(function(val){ return parseInt(val); }).reduce(function(a,b){ return a+b; });
			else{
				total = data.reduce(function(a,b){ return a+b; }); 
				data = data.join(",");
			}
			
			height = height || 30;
			width = width || 100;
			
            return [
				"<div class='inlinesparkline' style='width:",
				width.toString(),
				"px;height:",
				height.toString(),
				"'>",
				data,
				"</div>"
				].join("");
		},
		
		showApplication : function(app){
			// if there aren't any apps in the config, let everyone see all of them
			if (!util.applications) 
				return true;
			
			// otherwise only show an application if the user is in its access list
			else if (util.applications[app]) {
				for (var i=0; i<util.applications[app].access.length; i++)
					if (util.applications[app].access[i].userid == util.userid) return true;
				
				return false
			}
			
			else 
				return false;
		}
    };
	
    jQuery.fn.renderTemplate = function(templates,locals,callback){
        var self = this, whenarray = [], partials = {}, primary = "";
        
		// locals and callback are optional
        if (typeof(locals)=="function"){
            callback = locals;
            locals = {};
        }
		locals = locals || {};
		
		// normalize templates into array of { name, file }
		if (templates.constructor != Array) templates = [ templates ];
		templates = templates.map(function(val){
			if (typeof(val) == "object")
				return val;
			else if (val.indexOf("/") > -1)
				return { name:val.split("/").join("-"), file:val }
			else
				return { name:val, file:val };
		});
        
		// queue up template requests
        for (var i = 0; i < templates.length; i++) whenarray.push(util.getTemplate(templates[i].file));
        
        $.when.apply($,whenarray).done(function(){
            var templatearray = Array.apply(null,arguments);
            var partialtemplates = {}, templatename = "";
            
            for (var i=0; i<templates.length; i++){
				if (templatearray[i].length) partialtemplates[templates[i].name] = templatearray[i];
            }
            
			locals.render = function(){
				return function(template,render){
					var templates = render(template).split("|"), desiredtemplate = templates[0], defaulttemplate = templates[1];
					
					if (partialtemplates[desiredtemplate])
						return render("{{> "+desiredtemplate+"}}");
					else if (defaulttemplate && partialtemplates[defaulttemplate])
						return render("{{> "+defaulttemplate+"}}");
					else
						return "Could not render " + desiredtemplate + (defaulttemplate ? " or "+defaulttemplate : "");
				};
			};
			
            var result = $.mustache(partialtemplates[templates[0].name],locals,partialtemplates);
			
            if (self && self.length) self.html(result);
            if (callback) callback.call(self,result);
            
			$('.inlinesparkline',self).each(function(){
				var self = $(this);
				self.sparkline("html",{ width:self.width(), height:self.height() });
			});
        });
        
        return this;
    };
    
	function drawApplicationMenu(){
		
        var applications = util.deferredView("applications",{ update_seq:true });
		applications.done(function(data){
			var apps = [];
			
			if (data.rows.length) {
				var apps = data.rows[0].value.filter(util.showApplication).map(function(val){
					return {
						id: val,
						name: util.applications[val] ? util.applications[val].name : val,
						active: (util.url.app && util.url.app == val)
					};
				}).sort(function(a,b){
					return (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1)
				});
				
				$("#application-menu").renderTemplate([ "fragment/application-menu" ], {
					applications: apps,
					applicationurl: function(){
						return function(app){
							return util.rootpath + "application.html?app=" + app + "&logtype=error";
						};
					}
				}, function(){
					$('.dropdown-toggle').dropdown();
				});
			}
        });
		applications.fail(util.renderError);
        
	};
	util.onSessionReady(drawApplicationMenu);
	
	util.config = util.deferredConfig();
	util.config.done(function(config){
		if (config.db != util.db){
			util.dbname = config.db;
			util.db = $.couch.db(config.db);
			
			util.applications = {};
			if (config.applications) {
				for (var i=0; i<config.applications.length; i++) util.applications[config.applications[i].id] = config.applications[i];
			}
			
			util.stopChanges();
			if (util.sessionready) $(document).trigger("sessionReady");
		}
	});
	util.config.fail(util.renderError);
	
	$(function(){
		$("#ajax-indicator").ajaxStart(function(){
			$(this).addClass("loading");
		}).ajaxStop(function(){
			$(this).removeClass("loading");
		});
		
	    $("#account").couchLogin({
	        loggedIn : function(r) {
				util.userid = r.userCtx.name;
				util.username = r.userCtx.name;
				
	            $("#account").renderTemplate("authentication/loggedin",{
	                username : r.userCtx.name,
	                userpage : "_utils/document.html?" + encodeURIComponent(r.info.authentication_db) + "/org.couchdb.user%3A" + encodeURIComponent(r.userCtx.name),
	                configpage : util.rootpath + "config.html"
	            });
				util.sessionready = true;
				$(document).trigger("sessionReady");
	        },
	        loggedOut : function() {
	            $("#account").renderTemplate("authentication/loginform");
				$(document).trigger("sessionReady");
	        },
			error : util.renderError
	    });
	});
	
})();