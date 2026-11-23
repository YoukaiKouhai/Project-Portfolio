import os
import pandas as pd
import matplotlib.pyplot as plt
import plotly.express as px
from dash import Dash, html, dcc
#########################################################################
app = Dash(__name__)
class CovidDataAnalyzer:
    
    def __init__(self, filename):
        #store the filename as an attribute of the class
        self.filename = filename   

        #initialize an empty list called data
        self.data = []  

        #call the load_data method to load data from the CSV file 
        self.load_data()   

    
    def load_data(self):
        '''Define a method called load_data to load the CSV file and manipulate 
            the data'''
        #Load the CSV file into a DataFrame using Pandas read_csv method
        df = pd.read_csv(self.filename)

        #Rename columns as needed
        df = df.rename(columns={'inpatient_beds_used_covid':'inpatient_beds_used'})

        #Convert date column to datetime format using Pandas to_datetime
        #  method
        df['date'] = pd.to_datetime(df['collection_date'], format='%Y-%m-%d')

        #Set the data attribute to the DataFrame
        self.data = df

    
    def num_states(self):
        '''Define a method called num_states to calculate the number of states 
           in the data and return it as a string'''

        return len(self.data['state'].unique())

    
    def max_count(self):
        '''Define a method called max_count to calculate the maximum number of 
            inpatient beds occupied by COVID-19 patients and return it as a 
            string'''

        counts_max = self.data['Inpatient Beds Occupied by COVID-19 Patients Estimated'].str.replace(',', '').astype(int)
        return max(counts_max)


    def min_count(self):
        '''Define a method called min_count to calculate the minimum number of 
           inpatient beds occupied by COVID-19 patients and return it as a 
           string'''

        counts_min = self.data['Inpatient Beds Occupied by COVID-19 Patients Estimated'].str.replace(',', '').astype(int)
        return min(counts_min)

    
    def avg_percent(self):
        '''Define a method called avg_percent to calculate the average percentage
           of inpatient beds occupied by COVID-19 patients and return it as a 
           string'''
                
        flt_percent=self.data['Percentage of Inpatient Beds Occupied by COVID-19 Patients Estimated'].astype(float).mean()
        flt_percent=round(flt_percent,3)
        str_percent=str(flt_percent)+"%"
        return str_percent

    
    def total_inpatient_beds(self):
        '''Define a method called total_inpatient_beds to calculate the total 
           number of inpatient beds and return it as a string'''
        
        counts_bed=self.data['Total Inpatient Beds'].str.replace(',', '').astype(int).sum()
        return counts_bed

    def count_range(self):
        '''Define a method called count_range to calculate the range of inpatient
           counts and return it as a string'''
        counts = self.data['Inpatient Beds Occupied by COVID-19 Patients Estimated'].str.replace(',', '').astype(int)
        return max(counts) - min(counts)
    
    def analyze_inpatient_beds(self):
        '''Extracts the column of interest from the data, removes commas, and 
           converts the values to integers. Calculates summary statistics such 
           as mean, median, and standard deviation and returns them as a tuple.'''
        data = self.data['Inpatient Beds Occupied by COVID-19 Patients Estimated'].str.replace(',', '').astype(int)

        mean = round(data.mean(),3)
        median = data.median()
        std = round(data.std(),3)
        return mean, median, std
    
if __name__ == '__main__':
    # create CovidDataAnalyzer instance and analyze inpatient beds
    analyzer = CovidDataAnalyzer('estimated_inpatient_covid_ 20210214_1934.csv') 
    mean, median, std = analyzer.analyze_inpatient_beds()

    # gather summary statistics
    lines = [
        "Summary Statistics for Estimated Inpatient Beds Occupied by COVID-19 Patients",
        f"Number of unique territories data taken: {analyzer.num_states()}",
        f"Mean: {mean}",
        f"Median: {median}",
        f"Standard Deviation: {std}",
        f"Maximum inpatient count: {analyzer.max_count()}",
        f"Minimum inpatient count: {analyzer.min_count()}",
        f"Average percentage of inpatient beds occupied by COVID-19 patients estimated: {analyzer.avg_percent()}",
        f"Total inpatient beds: {analyzer.total_inpatient_beds()}",
        f"Range of inpatient counts: {analyzer.count_range()}",
    ]
    for line in lines:
        print(line)
    # Create a new directory for the output files
    if not os.path.exists("output files"):
        os.makedirs("output files")

    # Specify the file path for the output file to be saved in the new directory
    file_path = os.path.join("output files", "output.txt")

    # Write data to the output file
    with open(file_path, 'w') as f:
        for line in lines:
            f.write(line + '\n')
        print("\nData saved in the 'output files' folder.")
        
    analyzer.data['Inpatient Beds Occupied by COVID-19 Patients Estimated'] = analyzer.data['Inpatient Beds Occupied by COVID-19 Patients Estimated'].str.replace(',', '')
    analyzer.data['Inpatient Beds Occupied by COVID-19 Patients Estimated'] = pd.to_numeric(analyzer.data['Inpatient Beds Occupied by COVID-19 Patients Estimated'])
    #Group the data by date and calculate the mean value for each date
    data = analyzer.data.groupby('date')['Inpatient Beds Occupied by COVID-19 Patients Estimated'].mean()

    '''Create a  time series plot is created using matplotlib to 
       visualize the trend of the estimated inpatient beds occupied by 
       COVID-19 patients over time'''

    plt.plot(data.index, data.values)
    plt.xlabel('Date',fontdict={'fontsize': 9})
    plt.ylabel('Estimated Inpatient Beds Occupied by COVID-19 Patients',fontdict={'fontsize': 9})
    plt.title('Time Series Analysis of Estimated Inpatient Beds Occupied by COVID-19 Patients',fontdict={'fontsize': 10})
    plt.xticks(fontsize=5)
    plt.yticks(fontsize=8)
    try:
        plt.savefig('./output files/plot.png')
        print("\nImage saved")
    except:
        print("file is in directory")

    # read data from CSV file, clean and group data
    df = pd.read_csv('estimated_inpatient_covid_ 20210214_1934.csv', index_col=0)
    df['Inpatient Beds Occupied by COVID-19 Patients Estimated'] = df['Inpatient Beds Occupied by COVID-19 Patients Estimated'].str.replace(',', '').astype(float)
    df_grouped = df.groupby('collection_date')['Inpatient Beds Occupied by COVID-19 Patients Estimated'].sum().reset_index()
    dates = df_grouped['collection_date']
    estimates = df_grouped['Inpatient Beds Occupied by COVID-19 Patients Estimated']

    # create and customize plot
    fig = px.line(df_grouped, x='collection_date', y='Inpatient Beds Occupied by COVID-19 Patients Estimated')
    fig.update_layout(
        title='Time Series Analysis of Estimated Inpatient Beds Occupied by COVID-19 Patients',
        xaxis_title='Date',
        yaxis_title='Estimated Inpatient Beds Occupied by COVID-19 Patients',
        xaxis_tickfont_size=9,
        yaxis_tickfont_size=8,
        font=dict(family="Courier New, monospace", size=10, color="RebeccaPurple")
    )
    # create and run Dash app
    app = Dash(__name__)
    app.layout = html.Div([html.H1('Estimating COVID-19 Inpatient in the US'), dcc.Graph(id='my-graph', figure=fig)])
    app.run_server(debug=False)