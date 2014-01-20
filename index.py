#Indentation is 4 tabs.
#Available routes : /download/filehash  /upload  /server-usage /disk-usage
import hashlib
import os
import sqlite3
from datetime import date
from flask import Flask ,render_template ,request, redirect, url_for ,g ,jsonify ,send_from_directory , send_file
from werkzeug import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'

DATABASE='/home/www/database/files.db'

#app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 Please note this is max upload limit by flask which is 16mb now

#Database Connect function as given in flask docs
#Table schema CREATE TABLE files (id INTEGER PRIMARY KEY AUTOINCREMENT,filename VARCHAR,size VARCHAR,hash VARCHAR,date VARCHAR,counter VARCHAR);
def get_db():
	db = getattr(g, '_database', None)
	if db is None:
		db = g._database = sqlite3.connect(DATABASE)
	return db

#Database query function to return raw data from database
def query_db(query, args=(), one=False):
	cur = get_db().execute(query, args)
	rv = cur.fetchall()
	cur.close()
	return (rv[0] if rv else None) if one else rv

#index page get request
@app.route("/")
def index():
	return render_template('index.html')

#Upload get and post method to save files into directory
@app.route("/upload",methods=['GET','POST'])
def upload():
	if request.method == 'GET':
			return render_template('upload.html')
	elif request.method == 'POST':
			file = request.files['file']
			filename = secure_filename(file.filename)
			directory=os.path.join(app.config['UPLOAD_FOLDER'], filename)
			file.save(directory)
			size=os.path.getsize(directory)
			filehash=hashlib.sha1(directory).hexdigest()
			if(db_insert(filename,size,filehash)):
						#change filename to hash
						os.rename(directory,os.path.join(app.config['UPLOAD_FOLDER'], filehash))
						return filehash
			else:
						return 'Upload Failed'


@app.route("/download/<filehash>",methods=['GET'])
def download(filehash):
		#filehash is sha1 hash stored in database of file.Increase download counter
		data=query_db('select * from files where hash=?',[filehash])
		counter=int(data[0][5])+1
		try:
			get_db().execute("update files SET counter = ? WHERE hash=?", [counter,filehash])
			get_db().commit()
			#return send_from_directory(app.config['UPLOAD_FOLDER'], data[0][3])
			return send_file(os.path.join(app.config['UPLOAD_FOLDER'], data[0][3]),attachment_filename=data[0][1],as_attachment=True)
		except:
			return 'File not Found'

@app.route("/server-usage",methods=['GET'])
def server_usage():
	data=query_db('select * from files')
	bandwidth=0
	for i in data:
		bandwidth+=int(i[5])*int(i[2]) #Multiplying counter with size of file to get bandwidth amount
	return jsonify(bandwidthusage=str(bandwidth/1024.0)+" KB")


@app.route("/disk-usage",methods=['GET'])
def disk_usage():
	data=query_db('select * from files')
	diskspace=0
	for i in data:
		diskspace+=int(i[2])
	return jsonify(diskusage=str(diskspace/1024.0)+" KB")


#Its a simple function just return number of files link should be /db for application
@app.route("/db")
def db_table():
	data=query_db('select * from files')
	return jsonify(values=data)
	#for user in data:
    #	return user['filename'], user['size']

def db_insert(filename,size,filehash):
		filename=str(filename)
		size=int(size)
		filedate=str(date.today())
		file_exist=query_db('select * from files where hash=?',[filehash])
		if not file_exist:
			get_db().execute("insert into files (filename,size,hash,date,counter) values (?,?,?,?,?)", [filename,size,filehash,filedate,0])
			get_db().commit()
		return True


@app.teardown_appcontext
def close_connection(exception):
	db = getattr(g, '_database', None)
	if db is not None:
		db.close()

if __name__ == "__main__":
	app.run(debug=True,host='0.0.0.0')