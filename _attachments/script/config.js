// Apache 2.0 J Chris Anderson 2011
$(function() {
    
    var replicatorDB = $.couch.db("_replicator");
	var userDB = $.couch.db("_users");
    
    function drawConfig() {
        var params = { 
            startkey : [ util.url.session ],
            endkey : [ util.url.session, new Date() ],
            update_seq:true 
        }
        
        var logtypes = util.deferredView("log-types").pipe(function(data){
			var result = [];
			
			if (data.rows.length) {
				result = data.rows[0].value.sort().map(function(val){
					return {
						value: val,
						label: val
					};
				});
				result.unshift({
					value: "*",
					label: "All"
				});
			}
            
            return $.when(result);
        });
        
        var replicationjobs = util.deferredAll({ db:replicatorDB, resolve:true }).pipe(function(data){
            var jobs = data.filter(function(val){ return (val._replication_id && val.source && val.source == util.dbname); }).sort(function(a,b){ return (a.target < b.target ? 1 : -1); });;
            
            return $.when(jobs)
        });
        
		var dbs = util.deferredDBs().pipe(function(data){
			return $.when(data.filter(function(val){
				return (val.slice(0,1) != "_")
			}).map(function(val){
				return { name : val	}
			}));
		});
		
		var applications = util.deferredView("applications").pipe(function(data){
			return $.when(data.rows[0].value.sort());
		});
		
        var page = $.when(dbs,util.config,replicationjobs,logtypes,applications);
        page.done(function(dbs,config,jobs,logtypes,applications){
			
            for (var i=0; i<dbs.length; i++)
				dbs[i].active = (config.db == dbs[i].name);
			
            for (var i=0; i<jobs.length; i++){
                var alogtypes = (jobs[i].query_params && jobs[i].query_params.logtypes.length ? jobs[i].query_params.logtypes.split(",") : [ "*" ]);
                
                jobs[i].logtypes = [];
                for (var j=0; j<logtypes.length; j++){
                    jobs[i].logtypes.push({
                        value : logtypes[j].value,
                        label : logtypes[j].label,
                        active : (alogtypes.indexOf(logtypes[j].value) > -1)
                    });
                }
				
				for (var j=0; j<alogtypes.length; j++){
					if (jobs[i].logtypes.filter(function(val){ return (val.value==alogtypes[j]); }).length == 0)
						jobs[i].logtypes.push({ value:alogtypes[j], label:alogtypes[j], active:true, unlisted:true });
				};
            }
            
			if (!config.applications)
				config.applications = [];
			for (var i=0; i<applications.length; i++){
				var found = -1;
				
				for (var j=0; j<config.applications.length; j++)
					if (config.applications[j].id == applications[i]) found = j;
				
				if (found == -1)
					config.applications.push({
						index: config.applications.length,
						id: applications[i],
						name: applications[i],
						history: 14,
						access: [{ userid:util.userid, username:util.username }],
						alerts: []
					});
			}
			
            $("#content").renderTemplate([ "config", "config/general", "config/applications", "config/replication", "replication/form", "replication/teaser", "config/access" ], { 
				dbs : dbs,
                logtypes : logtypes,
                jobs : jobs,
				applications : config.applications
            },function(){
				$(".collapse").collapse();
				$("span[rel=popover]").popover();
			});
            
        });
        page.fail(util.renderError);
		
    };
    
	util.setupChanges(0);
	util.onSessionReady(drawConfig);
    
	$("a.general-update").live("click",function(){
		var newdbname = $("#log-db").val();
		
		util.config.done(function(config){
			var newdb = $.couch.db(newdbname), olddbname = config.db;
			
			var appdesign = util.deferredGet("_design/"+util.design,{ db:util.appdb });
			var logdesignget = util.deferredGet("_design/"+util.design,{ db:newdb });
			var logdesign = $.Deferred();
			logdesignget.done(function(doc){
				logdesign.resolve(doc);
			});
			logdesignget.fail(function(err){
				logdesign.resolve({ _id:"_design/errorlog" });
			});
	        var replicationjobs = util.deferredAll({ db:replicatorDB, resolve:true }).pipe(function(jobs){
				return $.when(
					jobs.filter(function(val){
						return (val.source && val.source == olddbname && val.filter && val.filter == "errorlog/bylogtype");
					})
				);
			});
	        
			var update = $.when(appdesign,logdesign,replicationjobs);
			update.done(function(appdesign,logdesign,jobs){
				
				var saves = [], complete = {};
				
				if (config.db != newdbname){
					// config update
					config.db = newdbname;
					saves.push(util.deferredSave(config,{ db:util.appdb }));
					
					// replication jobs update
					for (var i=0; i<jobs.length; i++){
						jobs[i].source = newdbname;
						saves.push(util.deferredSave(jobs[i], {
							db: replicatorDB
						}));
					}
				}
				
				// target db update
				var changed = false, designupdates = [ "filters", "language", "updates", "views", "document_update_validation" ];
				
				for (var i=0; i<designupdates.length; i++){
					if (!logdesign[designupdates[i]] || JSON.stringify(appdesign[designupdates[i]]) != JSON.stringify(logdesign[designupdates[i]])){
						changed = true;
						logdesign[designupdates[i]] = appdesign[designupdates[i]];
					}
				}
				
				if (changed){
					saves.push(util.deferredSave(logdesign,{ db:newdb }));
				}
				
				complete = $.when.apply($,saves);
				complete.done(function(){
					util.stopChanges();
					util.dbname = newdbname;
					util.db = newdb;
					if (util.sessionready) $(document).trigger("sessionReady");
				});
				util.renderError("To get changes from the new database you will need to reload any Fubar pages you have open.");
				
			});
			update.fail(util.renderError);
		});
		
		return false;
	});
	
	
	jQuery.fn.edit = function(){
		if (this.size() && !this.is(".editing")) {
			this.addClass("editing").html("<input type='text' value='" + this.html() + "'>").find("input").bind("blur", function(){
				$(this).parent().unedit();
			}).bind("keypress",function(e){
				if (e.which == 13) $(this).parent().unedit();
			}).click().select();
		}
		
		return this;
	};
	jQuery.fn.unedit = function(){
		if (this.size() && this.is(".editing")) {
			var newval = this.find("input").val(), oldval = this.data("oldvalue");
			
			if (newval.toString() !== oldval.toString()) 
				this.data("change", { 
					index : this.parents("tr").first().data("index"), 
					field : this.data("field"), 
					value : newval 
				}).addClass("changed").html(newval);
			else 
				this.data("change", null).removeClass("changed").html(oldval);
				
			this.removeClass("editing");
		}
		
		return this;
	};
	jQuery.fn.editable = function(){
		this.live("click",function(){
			$(this).edit();
		});
	};
	$("td.application-name,td.application-history").editable();
	
	$(".application-access-item-remove").live("click",function(){
		var self = $(this).parents(".application-access-item");
		
		if (self.is(".removed"))
			self.data("change",null).removeClass("changed").removeClass("removed").find("application-access-item-edit").hide();
		else if (self.is(".added"))
			self.remove();
		else
			self.data("change",{ 
				index : self.parents("tr").first().data("index"),
				field : "access",
				action : "remove",
				value: {
					userid: self.data("userid"),
					username: self.data("username")
				}
			}).addClass("changed").addClass("removed").find("application-access-item-edit").show();
		
		return false;
	});
	
	$(".application-access-item-add").live("click",function(){
		var self = $(this), index = self.parents("tr").first().data("index");
		
		var users = util.deferredAll({ db:userDB, resolve:true }).pipe(function(data){
            var users = data.filter(function(val){ 
				return (val.name); 
			}).sort(function(a,b){ 
				return (a._id < b._id ? 1 : -1); 
			}).map(function(val){
				return {
					userid : val.name,
					username : val.name
				}
			});
            
            return $.when(users)
        });
		
		beginadd = $.when(util.config,users);
		beginadd.done(function(config,users){
			$("#modal").renderTemplate([ "config/adduser" ],{
				targettypes : [{
					id : "email",
					name : "Email"
				},{
					id : "pushover",
					name : "Pushover"
				}],
				users : users.filter(function(val){
					for (var i=0; i<config.applications[index].access.length; i++)
						if (val.userid == config.applications[index].access[i].userid) return false;
					return true;
				})
			},function(){
				
				$("#modal .btn-primary").unbind("click").bind("click",function(){
					if ($("input[name=select-user]:checked").val() == "existing") {
						newuser = $.when({
							userid : $("#existing-user").val(),
							username : $("#existing-user option:selected").html(),
							sendalerts : ($("#new-user-sendalerts:checked").size() == 1),
							threshold : parseInt($("#new-user-threshold").val())
						});
					}
					else {
						newuser = $.Deferred();
						
						$.couch.signup({
							name : $("#new-user").val(),
							targettype : $("#new-user-targettype").val(),
							targetid : $("#new-user-targetid").val()
						}, $("#new-user-password").val() || $("#new-user").val(), {
							success: function(){
								newuser.resolve({ 
									userid : $("#new-user").val(), 
									username : $("#new-user").val(),
									sendalerts : ($("#new-user-sendalerts:checked").size() == 1),
									threshold : parseInt($("#new-user-threshold").val())
								});
							}
						});
					}
					
					newuser.done(function(newuser){
						$().renderTemplate([ "config/access" ],{
							userid : newuser.userid,
							username : newuser.username,
							sendalerts : newuser.sendalerts,
							class : "changed added"
						},function(html){
							$(html).insertBefore(self.parents(".application-access-item")).data("change",{ 
								index : index, 
								field : "access", 
								action : "add", 
								value : newuser 
							});
						});
					});
					newuser.fail(util.renderError);
					
					$("#modal").modal("hide");
				});
				
				$("#modal").modal("show");
				
			});
		});
		beginadd.fail(util.renderError);
		
		return false;
	});
	
	$(".application-access-item-edit").live("click",function(){
		var self = $(this).parents(".application-access-item"), userappdata = self.data("change");
		
		var userdata = util.deferredGet("org.couchdb.user:"+self.data("userid"),{ db:userDB })
		
		var users = util.deferredAll({ db:userDB, resolve:true }).pipe(function(data){
            var users = data.filter(function(val){ 
				return (val.name); 
			}).sort(function(a,b){ 
				return (a._id < b._id ? 1 : -1); 
			}).map(function(val){
				return {
					userid : val.name,
					username : val.name
				}
			});
            
            return $.when(users)
        });
		
		var beginedit = $.when(userdata,util.config,users);
		beginedit.done(function(userdata,config,users){
			var index = parseInt(self.parents("tr").first().data("index"));
			
			if (userappdata){
				userappdata = userappdata.value;
			}
			else {
				userappdata = null;
				for (var i=0; i<config.applications[index].access.length; i++){
					if (config.applications[index].access[i].userid == userdata.name)
						userappdata = config.applications[index].access[i];
				}
			}
			
			$("#modal").renderTemplate([ "config/edituser" ],{
				username : userdata.name,
				targettypes : [{
					id : "email",
					name : "Email",
					active : (userdata.targettype == "email")
				},{
					id : "pushover",
					name : "Pushover",
					active : (userdata.targettype == "pushover")
				}],
				targetid : userdata.targetid,
				sendalerts : userappdata.sendalerts,
				threshold : userappdata.threshold,
				users : users.filter(function(val){
					for (var i=0; i<config.applications[index].access.length; i++)
						if (val.userid == config.applications[index].access[i].userid) return false;
					return true;
				})
			},function(){
				$("#modal .btn-primary").unbind("click").bind("click",function(){
					if ($("#user-password").val().length) {
						delete userdata.password_sha;
						delete userdata.salt;
						userdata.password = $("#user-password").val();
					}
					userdata.targettype = $("#user-targettype").val();
					userdata.targetid = $("#user-targetid").val();
					userupdate = util.deferredSave(userdata,{ db:userDB });
					
					userupdate.done(function(){
						$().renderTemplate([ "config/access" ],{
							userid : userdata.name,
							username : userdata.name,
							sendalerts : ($("#user-sendalerts:checked").size() == 1),
							class : "changed updated"
						},function(html){
							$(html).replaceAll(self).data("change",{ 
								index : index, 
								field : "access", 
								action : "update", 
								value : {
									userid : userdata.name,
									sendalerts : ($("#user-sendalerts:checked").size() == 1),
									threshold : parseInt($("#user-threshold").val())
								} 
							});
						});
					});
					userupdate.fail(util.renderError);
					
					$("#modal").modal("hide");
				});
				
				$("#modal").modal("show");
			});
		});
		beginedit.fail(util.renderError);
		
		return false;
	});
	
	$("a.applications-update").live("click",function(){
		var changes = $(".changed").map(function(index,el){
			return $(this).data("change");
		});
		
		util.config.done(function(config){
			for (var i=0; i<changes.length; i++){
				switch (changes[i].field){
					case "name":
						config.applications[changes[i].index].name = changes[i].value;
						break;
					
					case "history":
						config.applications[changes[i].index].history = parseInt(changes[i].value);
						break;
						
					case "access":
						if (changes[i].action == "add"){
							config.applications[changes[i].index].access.push(changes[i].value);
						}
						else if (changes[i].action == "update"){
							for (var j=0; j<config.applications[changes[i].index].access.length; j++){
								if (config.applications[changes[i].index].access[j].userid == changes[i].value.userid){
									config.applications[changes[i].index].access[j].sendalerts = changes[i].value.sendalerts;
									config.applications[changes[i].index].access[j].threshold = changes[i].value.threshold;
								}
							}
						}
						else {
							config.applications[changes[i].index].access = config.applications[changes[i].index].access.filter(function(val){
								return (val.userid != changes[i].value.userid);
							});
						}
						
						break;
				}
			}
			
			var complete = util.deferredSave(config,{ db:util.appdb });
			complete.done(function(){
				util.stopChanges();
				if (util.sessionready) $(document).trigger("sessionReady");
			});
		});
		
		return false;
	});
	
	
    $("a.job-create").live("click",function(){
        var query_params = {}, query_params_array = [];
        var logtypes = $(this).parents("tr").first().find("[name=logtypes]").val() || [];
		
		if ($(this).parents("tr").first().find("input[name=logtypes]").val().length)
			logtypes.push($(this).parents("tr").first().find("input[name=logtypes]").val());
			
		if (logtypes.length == 0) logtypes.push("*");
		
        var newjob = {
            source : util.dbname,
            target : $(this).parents("tr").first().find("[name=target]").val(),
            create_target : ($(this).parents("tr").first().find("[name=create_target]:checked").length > 0),
            continuous : ($(this).parents("tr").first().find("[name=continuous]:checked").length > 0),
            filter : "errorlog/bylogtype",
            query_params : { logtypes : logtypes.join(",") }
        };
        
        var saveddoc = util.deferredSave(newjob,{ db:replicatorDB })
        
        saveddoc.done(drawConfig);
        saveddoc.fail(util.renderError);
        
        return false;
    });
    
    $("a.job-remove").live("click",function(){
        if (!confirm("Are you sure?")) return false;
        
        var doc = {
            _id : $(this).parents("tr").first().find("[name=id]").val(),
            _rev : $(this).parents("tr").first().find("[name=rev]").val()
        };
        
        removeddoc = util.deferredRemove(doc,{ db:replicatorDB });
        
        removeddoc.done(drawConfig);
        removeddoc.fail(util.renderError);
        
        return false;
    });
    
    $("a.job-change").live("click",function(){
        $(this).parents("tr").first().find(".job-display").hide();
        $(this).parents("tr").first().find(".job-edit").show();
        
        return false;
    });
    
    $("a.job-cancel").live("click",function(){
        $(this).parents("tr").first().find(".job-edit").hide();
        $(this).parents("tr").first().find(".job-display").show();
        
        return false;
    });
    
    $("a.job-save").live("click",function(){
        var jobupdate = {}, query_params_array = [], query_params = {};
        var logtypes = $(this).parents("tr").first().find("[name=logtypes]").val() || [];
		
		if ($(this).parents("tr").first().find("input[name=logtypes]").val().length)
			logtypes.push($(this).parents("tr").first().find("input[name=logtypes]").val());
			
		if (logtypes.length == 0) logtypes.push("*");
        
        jobupdate.target = $(this).parents("tr").first().find("[name=target]").val();
        jobupdate.create_target = ($(this).parents("tr").first().find("[name=create_target]:checked").length > 0);
        jobupdate.continuous = ($(this).parents("tr").first().find("[name=continuous]:checked").length > 0);
        jobupdate.filter = "errorlog/bylogtype";
        jobupdate.query_params = { logtypes : logtypes.join(",") };
        
		if ($(this).parents("tr").first().find("input[name=logtypes]").val().length)
			jobupdate.query_params.logtypes.push($(this).parents("tr").first().find("input[name=logtypes]").val());
			
		if (jobupdate.query_params.logtypes.length == 0) jobupdate.query_params.logtypes.push("*");
		
        var doc = util.deferredGet($(this).parents("tr").first().find("[name=id]").val(),{ db:replicatorDB }).pipe(function(doc){
            doc.target = jobupdate.target;
            doc.create_target = jobupdate.create_target;
            doc.continuous = jobupdate.continuous;
            doc.filter = jobupdate.filter;
            doc.query_params = jobupdate.query_params;
            
            return util.deferredSave(doc,{ db:replicatorDB });
        });
        
        doc.done(drawConfig);
        doc.fail(util.renderError);
        
        return false;
    });
});