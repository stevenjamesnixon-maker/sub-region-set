/**
 * Module Description: Selects sub-region based on postcode prefix
 * 
 * Version    Date            Author           Remarks

 * 1.00       18 Jul 2012     peter
 *
 */
function subRegion()
{	
	if (nlapiGetFieldValue('custentity_sub_region') == '' || nlapiGetFieldValue('custentity_sub_region') == null)
	{
		//new sub-regions Jan 2022
		//southWest  = ['BA', 'BH', 'BS', 'DT', 'EX', 'PL', 'PO', 'RG', 'SN', 'SO', 'SP', 'TA', 'TQ', 'TR'];
		//southEast  = ['BN', 'BR', 'CM', 'CO', 'CR', 'CT', 'DA', 'E', 'EC', 'EN', 'GU', 'HA', 'IG', 'KT', 'ME', 'N', 'NW', 'RH', 'RM', 'SE', 'SL', 'SM', 'SS', 'SW', 'TN', 'TW', 'UB', 'W', 'WC', 'WD'];
		//northWest  = ['B', 'BB', 'BD', 'BL', 'CH', 'CV', 'CW', 'DE', 'DY', 'FY', 'GL', 'GL', 'HD', 'HG', 'HR', 'HX', 'L', 'LS', 'M', 'OL', 'PR', 'S', 'SK', 'ST', 'TF', 'WA', 'WF', 'WN', 'WR', 'WS', 'WV', 'OX'];
		//northEast  = ['AL', 'CB', 'DN', 'HP', 'HU', 'LE', 'LN', 'LU', 'MK', 'NG', 'NN', 'NR', 'PE', 'SG', 'YO', 'IP'];
		//unsupported1  = ['CF', 'GY', 'JE', 'LD', 'LL', 'NP', 'SA', 'SY'];
		//unsupported2 = ['AB', 'BT', 'CA', 'DD', 'DG', 'DH', 'DL', 'EH', 'FK', 'G', 'HS', 'IM', 'IV', 'KA', 'KW', 'KY', 'LA', 'ML', 'NE', 'PA', 'PH', 'SR', 'TD', 'TS', 'ZE'];

	//new sub-regions May 24
		southWest  = ['BA', 'BH', 'BS', 'DT', 'EX', 'PL',  'TA', 'TQ', 'TR'];
		southCentral = ['BN','GU','HP', 'KT','PO', 'RG','RH','SL', 'SN', 'SO', 'SP','TW'];
		southEast  = ['AL', 'BR', 'CM', 'CO', 'CR', 'CT', 'DA', 'E', 'EC', 'EN',  'HA', 'IG',  'ME', 'N', 'NW',  'RM', 'SE', 'SM', 'SS', 'SW', 'TN',  'UB', 'W', 'WC', 'WD'];
		northWest  = ['B', 'BB', 'BD', 'BL', 'CH', 'CV', 'CW', 'DE', 'DY', 'FY', 'GL', 'GL', 'HD', 'HG', 'HR', 'HX', 'L', 'LS', 'M', 'OL', 'PR', 'S', 'SK', 'ST', 'TF', 'WA', 'WF', 'WN', 'WR', 'WS', 'WV'
, 'OX'];
		northEast  = [ 'CB', 'DN', 'HU','IP', 'LE', 'LN', 'LU', 'MK', 'NG', 'NN', 'NR', 'PE', 'SG', 'YO'];
		unsupported1  = ['CF', 'GY', 'JE', 'LD', 'LL', 'NP', 'SA', 'SY'];
		unsupported2 = ['AB', 'BT', 'CA', 'DD', 'DG', 'DH', 'DL', 'EH', 'FK', 'G', 'HS', 'IM', 'IV', 'KA', 'KW', 'KY', 'LA', 'ML', 'NE', 'PA', 'PH', 'SR', 'TD', 'TS', 'ZE'];

		//var recordType = nlapiGetRecordType();
		var customerID = nlapiGetRecordId();
		var customerPostcode;
		var custCategory = nlapiGetFieldValue('category')
		if (!nlapiGetFieldValue('parent')){	customerPostcode = nlapiGetFieldValue('billzip');} 
		else { customerPostcode = nlapiGetFieldValue('shipzip');}


		nlapiLogExecution('DEBUG','recordType = '+nlapiGetRecordType()+', customerID = '+customerID+', customerPostcode = '+customerPostcode);
		if (customerPostcode != null && customerPostcode != '')
		{
			try{
				var postcodePrefix = customerPostcode.substring(0,2); //grab the first two letters from the postcode
				var pcChar = customerPostcode.substring(1,2); //look at the 2nd letter
				if (pcChar >= 0 && pcChar <= 9) //if it is a number 0-9...
				{
					postcodePrefix = customerPostcode.substring(0,1); //...just use the first letter
				}
				//alert ('postcode = ' +customerPostcode+ ', prefix = ' +postcodePrefix+', 2nd Char = ' +pcChar);
				var Loading = nlapiLoadRecord(nlapiGetRecordType(), customerID)


				if (isValueInArray(southWest, postcodePrefix) == true){
					Loading.setFieldValue('custentity_sub_region', 3);
					Loading.setFieldValue('custentity_field_sales_rep', 164346);//Mike Casey
				}
				else if (isValueInArray(southCentral, postcodePrefix) == true){
					Loading.setFieldValue('custentity_sub_region', 16);//Added new south central sub region to sub regions list (ID=702)
					Loading.setFieldValue('custentity_field_sales_rep', 2167515);//Terry Troth, (Micahel Cabral 09/04/2025)
				}
				else if (isValueInArray(northEast, postcodePrefix) == true){
					Loading.setFieldValue('custentity_sub_region', 9);
					Loading.setFieldValue('custentity_field_sales_rep', 327641);//Paul Stimpson
				}
				else if (isValueInArray(southEast, postcodePrefix) == true){
					Loading.setFieldValue('custentity_sub_region', 5);
					Loading.setFieldValue('custentity_field_sales_rep', 586630);//Martyn Linsdell
				}
				else if (isValueInArray(northWest, postcodePrefix) == true){
					Loading.setFieldValue('custentity_sub_region', 8);
					Loading.setFieldValue('custentity_field_sales_rep', 1969000);// Tony Stinton (Was Paul Wood updated 20/08/2024),  (was Simon Tate updated 08/11/23), (was Jessica Ellmore updated 09/08/2023), (was Andrew Baines updsted 01/11/2021)
				}	
				else if (isValueInArray(Unsupported1, postcodePrefix) == true){
					Loading.setFieldValue('custentity_sub_region', 14); //Unsupported 1
					Loading.setFieldValue('custentity_field_sales_rep', 12727);//Paul Wood
				}	
				else if (isValueInArray(Unsupported2, postcodePrefix) == true){
					Loading.setFieldValue('custentity_sub_region', 15); //Unsupported 2
					Loading.setFieldValue('custentity_field_sales_rep', 12727);//Paul Wood
				}
				else{
					Loading.setFieldValue('custentity_sub_region', 12);//Undefined
					Loading.setFieldValue('custentity_field_sales_rep', ''); 
				}
//				if (custCategory == 15 && isValueInArray(merchant, postcodePrefix) == true){
//				Loading.setFieldValue('custentity_field_sales_rep', 164346);//Mike Casey
//				}
				Loading.setFieldValue('custentity_subregion_check', 'T');
				nlapiSubmitRecord(Loading);
			}
			catch(e){
				alert('There was an error setting the "Sub-Region" field. Please check this at your convenience')
			}


		}
	}
}

function scheduledSubRegionUpdate()
{
	nlapiLogExecution('AUDIT','PB Edit', 'Start');

	//new sub-regions Jan 2022
	//southWest  = ['BA', 'BH', 'BS', 'DT', 'EX', 'PL', 'PO', 'RG', 'SN', 'SO', 'SP', 'TA', 'TQ', 'TR'];
	//southEast  = ['BN', 'BR', 'CM', 'CO', 'CR', 'CT', 'DA', 'E', 'EC', 'EN', 'GU', 'HA', 'IG', 'KT', 'ME', 'N', 'NW', 'RH', 'RM', 'SE', 'SL', 'SM', 'SS', 'SW', 'TN', 'TW', 'UB', 'W', 'WC', 'WD'];
	//northWest  = ['B', 'BB', 'BD', 'BL', 'CH', 'CV', 'CW', 'DE', 'DY', 'FY', 'GL', 'GL', 'HD', 'HG', 'HR', 'HX', 'L', 'LS', 'M', 'OL', 'PR', 'S', 'SK', 'ST', 'TF', 'WA', 'WF', 'WN', 'WR', 'WS', 'WV', 'OX'];
	//northEast  = ['AL', 'CB', 'DN', 'HP', 'HU', 'LE', 'LN', 'LU', 'MK', 'NG', 'NN', 'NR', 'PE', 'SG', 'YO', 'IP'];
	//unsupported1  = ['CF', 'GY', 'JE', 'LD', 'LL', 'NP', 'SA', 'SY'];
	//unsupported2 = ['AB', 'BT', 'CA', 'DD', 'DG', 'DH', 'DL', 'EH', 'FK', 'G', 'HS', 'IM', 'IV', 'KA', 'KW', 'KY', 'LA', 'ML', 'NE', 'PA', 'PH', 'SR', 'TD', 'TS', 'ZE'];

	//new sub-regions May 24
	southWest  = ['BA', 'BH', 'BS', 'DT', 'EX', 'PL',  'TA', 'TQ', 'TR'];
	southCentral = ['BN','GU','HP', 'KT','PO', 'RG','RH','SL', 'SN', 'SO', 'SP','TW'];
	southEast  = ['AL', 'BR', 'CM', 'CO', 'CR', 'CT', 'DA', 'E', 'EC', 'EN',  'HA', 'IG',  'ME', 'N', 'NW',  'RM', 'SE', 'SM', 'SS', 'SW', 'TN',  'UB', 'W', 'WC', 'WD'];
	northWest  = ['B', 'BB', 'BD', 'BL', 'CH', 'CV', 'CW', 'DE', 'DY', 'FY', 'GL', 'GL', 'HD', 'HG', 'HR', 'HX', 'L', 'LS', 'M', 'OL', 'PR', 'S', 'SK', 'ST', 'TF', 'WA', 'WF', 'WN', 'WR', 'WS', 'WV', 'OX'];
	northEast  = [ 'CB', 'DN', 'HU','IP', 'LE', 'LN', 'LU', 'MK', 'NG', 'NN', 'NR', 'PE', 'SG', 'YO'];
	unsupported1  = ['CF', 'GY', 'JE', 'LD', 'LL', 'NP', 'SA', 'SY'];
	unsupported2 = ['AB', 'BT', 'CA', 'DD', 'DG', 'DH', 'DL', 'EH', 'FK', 'G', 'HS', 'IM', 'IV', 'KA', 'KW', 'KY', 'LA', 'ML', 'NE', 'PA', 'PH', 'SR', 'TD', 'TS', 'ZE'];


	var searchresults = nlapiSearchRecord('customer',6594/*,filters,columns*/);
	try{
		nlapiLogExecution('AUDIT','Customer Search', 'number of results: '+searchresults.length);
	}
	catch(e){
		nlapiLogExecution('AUDIT','No Customer Records Found',e)
	}
	for ( var i = 0; searchresults != null && i < 400; i++ )
	{
		searchresult = searchresults[i];
		var customerID = searchresult.getId();
		var recordType = searchresult.getRecordType();
		var custCategory = searchresult.getValue('category');
		var customerPostcode = searchresult.getValue('billzipcode'); //grab the postcode from the customer record
		var subregion = '';
		if (customerPostcode != null && customerPostcode != '')
		{
			var postcodePrefix = customerPostcode.substring(0,2).toUpperCase(); //grab the first two letters from the postcode
			var pcChar = customerPostcode.substring(1,2); //look at the 2nd letter
			if (pcChar >= 0 && pcChar <= 9) //if it is a number 0-9...
			{
				postcodePrefix = customerPostcode.substring(0,1).toUpperCase(); //...just use the first letter
			}
			var Loading = nlapiLoadRecord(recordType, customerID)
			if (isValueInArray(southWest, postcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 3);
				Loading.setFieldValue('custentity_field_sales_rep', 164346);//Mike Casey
				subregion = 'South West'
			}
			else if (isValueInArray(southCentral, postcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 16);
				Loading.setFieldValue('custentity_field_sales_rep', 2167515);//Terry Troth, (Micahel Cabral 09/04/2025)
				subregion = 'South Central'
			}
			else if (isValueInArray(northEast, postcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 9);
				Loading.setFieldValue('custentity_field_sales_rep', 327641);//Paul Stimpson
				subregion = 'North East'
			}
			else if (isValueInArray(southEast, postcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 5);
				Loading.setFieldValue('custentity_field_sales_rep', 586630);//Martyn Linsdell
				subregion = 'South East'
			}
			else if (isValueInArray(northWest, postcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 8);
				Loading.setFieldValue('custentity_field_sales_rep', 1969000);// Tony Stinton (Was Paul Wood updated 20/08/2024), (was Simon Tate updated 08/11/23), (was Jessica Ellmore updated 09/08/2023), (was Andrew Baines updsted 01/11/2021)
				subregion = 'North West'
			}	
			else if (isValueInArray(unsupported1, postcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 14); //Unsupported 1
				Loading.setFieldValue('custentity_field_sales_rep', 12727);//Paul Wood
				subregion = 'Unsupported 1'
			}	
			else if (isValueInArray(unsupported2, postcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 15); //Unsupported 2
				Loading.setFieldValue('custentity_field_sales_rep', 12727);//Paul Wood
				subregion = 'Unsupported 2'
			}
			else{
				Loading.setFieldValue('custentity_sub_region', 12);//Undefined
				Loading.setFieldValue('custentity_field_sales_rep', ''); 
				subregion = 'Undefined'
			}
//			if (custCategory == 15 && isValueInArray(merchant, postcodePrefix) == true){
//			Loading.setFieldValue('custentity_field_sales_rep', 164346);//Mike Casey
//			}
			Loading.setFieldValue('custentity_subregion_check', 'T');
			try{
				if(custCategory == '', !custCategory){
					nlapiSubmitRecord(Loading, false, true);
				}
				else {
					nlapiSubmitRecord(Loading);
				}
			}
			catch(e){
				nlapiLogExecution('ERROR','Record Submission failed',e)
			}
		} nlapiLogExecution('DEBUG','Result number: '+i+' '+searchresult.getText('custentity_sub_region'), 'recordType = '+recordType+', customerID = '+customerID+', customerPostcode = '+customerPostcode+' '+subregion);
	}


	var subSearchresults = nlapiSearchRecord('customer',10390/*,filters,columns*/);
	try{
		nlapiLogExecution('AUDIT','Sub-customer Search', 'number of results: '+subSearchresults.length);
	}
	catch(e){
		nlapiLogExecution('AUDIT','No Sub-customer Records Found',e)
	}
	for ( var i = 0; subSearchresults != null && i < 300; i++ )
	{
		subSearchresult = subSearchresults[i];
		var subCustomerID = subSearchresult.getId();
		var recordType = subSearchresult.getRecordType();
		var subCustomerPostcode = subSearchresult.getValue('shipzip'); //grab the postcode from the customer record
		var subregion = '';
		var custCategory = subSearchresult.getValue('category');
		if (subCustomerPostcode != null && subCustomerPostcode != '')
		{
			var subPostcodePrefix = subCustomerPostcode.substring(0,2).toUpperCase(); //grab the first two letters from the postcode
			var pcChar = subCustomerPostcode.substring(1,2); //look at the 2nd letter
			if (pcChar >= 0 && pcChar <= 9) //if it is a number 0-9...
			{
				subPostcodePrefix = subCustomerPostcode.substring(0,1).toUpperCase(); //...just use the first letter
			}
			var Loading = nlapiLoadRecord(recordType, subCustomerID)

			if (isValueInArray(southWest, subPostcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 3);
				Loading.setFieldValue('custentity_field_sales_rep', 164346);//Mike Casey
				subregion = 'South West'
			}
			else if (isValueInArray(southCentral, postcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 16);
				Loading.setFieldValue('custentity_field_sales_rep', 2167515);//Terry Troth, (Micahel Cabral 09/04/2025)
				subregion = 'South Central'
			}
			else if (isValueInArray(northEast, subPostcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 9);
				Loading.setFieldValue('custentity_field_sales_rep', 327641);//Paul Stimpson
				subregion = 'North East'
			}
			else if (isValueInArray(southEast, subPostcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 5);
				Loading.setFieldValue('custentity_field_sales_rep', 586630);//Martyn Linsdell
				subregion = 'South East'
			}
			else if (isValueInArray(northWest, subPostcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 8);
				Loading.setFieldValue('custentity_field_sales_rep', 1969000);// Tony Stinton (Was Paul Wood updated 20/08/2024), (was Simon Tate updated 08/11/23), (was Jessica Ellmore updated 09/08/2023), (was Andrew Baines updsted 01/11/2021)
				subregion = 'North West'
			}	
			else if (isValueInArray(unsupported1, subPostcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 14); //Unsupported 1
				Loading.setFieldValue('custentity_field_sales_rep', 12727);//Paul Wood
				subregion = 'Unsupported 1'
			}	
			else if (isValueInArray(unsupported2, subPostcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 15); //Unsupported 2
				Loading.setFieldValue('custentity_field_sales_rep', 12727);//Paul Wood
				subregion = 'Unsupported 2'
			}
			else{
				Loading.setFieldValue('custentity_sub_region', 12);//Undefined
				Loading.setFieldValue('custentity_field_sales_rep', ''); 
				subregion = 'Undefined'
			}
//			nlapiLogExecution('DEBUG', 'Category', custCategory + ' / ' + subCustomerID)
//			if (custCategory == 15 && isValueInArray(merchant, subPostcodePrefix) == true){
//			Loading.setFieldValue('custentity_field_sales_rep', 164346);//Mike Casey
//			}
			Loading.setFieldValue('custentity_subregion_check', 'T');
			try{
				nlapiSubmitRecord(Loading);
			}
			catch(e){
				nlapiLogExecution('ERROR','Record Submission failed',e)
			}
		} nlapiLogExecution('DEBUG','Result number: '+i+' '+subSearchresult.getText('custentity_sub_region'), 'recordType = '+recordType+', sub-customerID = '+subCustomerID+', sub-customerPostcode = '+subCustomerPostcode+' '+subregion);
	}



	var jobSearchresults = nlapiSearchRecord('customer',7254/*,filters,columns*/);
	try{
		nlapiLogExecution('AUDIT','Job Search', 'number of results: '+jobSearchresults.length);
	}
	catch(e){
		nlapiLogExecution('AUDIT','No Job Records Found',e)
	}
	for ( var j = 0; jobSearchresults != null && j < 400; j++ )
	{	
		jobSearchresult = jobSearchresults[j];
		var jobID = jobSearchresult.getId();
		var recType = jobSearchresult.getRecordType();
		var jobPostcode = jobSearchresult.getValue('billzipcode'); //grab the postcode from the customer record
		var jobSubregion = '';
		if (jobPostcode != null && jobPostcode != '')
		{
			var jobPostcodePrefix = jobPostcode.substring(0,2).toUpperCase(); //grab the first two letters from the postcode
			var pcChar = jobPostcode.substring(1,2); //look at the 2nd letter
			if (pcChar >= 0 && pcChar <= 9) //if it is a number 0-9...
			{
				jobPostcodePrefix = jobPostcode.substring(0,1).toUpperCase(); //...just use the first letter
			}
			var Loading = nlapiLoadRecord(recType, jobID)

			if (isValueInArray(southWest, jobPostcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 3);
				Loading.setFieldValue('custentity_field_sales_rep', 164346);//Mike Casey
				subregion = 'South West'
			}
			else if (isValueInArray(southCentral, postcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 16);
				Loading.setFieldValue('custentity_field_sales_rep', 2167515);//Terry Troth, (Micahel Cabral 09/04/2025)
				subregion = 'South Central'
			}
			else if (isValueInArray(northEast, jobPostcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 9);
				Loading.setFieldValue('custentity_field_sales_rep', 327641);//Paul Stimpson
				subregion = 'North East'
			}
			else if (isValueInArray(southEast, jobPostcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 5);
				Loading.setFieldValue('custentity_field_sales_rep', 586630);//Martyn Linsdell
				subregion = 'South East'
			}
			else if (isValueInArray(northWest, jobPostcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 8);
				Loading.setFieldValue('custentity_field_sales_rep', 1969000);// Tony Stinton (Was Paul Wood updated 20/08/2024), (was Simon Tate updated 08/11/23), (was Jessica Ellmore updated 09/08/2023), (was Andrew Baines updsted 01/11/2021)
				subregion = 'North West'
			}	
			else if (isValueInArray(unsupported1, jobPostcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 14); //Unsupported 1
				Loading.setFieldValue('custentity_field_sales_rep', 12727);//Paul Wood
				subregion = 'Unsupported 1'
			}	
			else if (isValueInArray(unsupported2, jobPostcodePrefix) == true){
				Loading.setFieldValue('custentity_sub_region', 15); //Unsupported 2
				Loading.setFieldValue('custentity_field_sales_rep', 12727);//Paul Wood
				subregion = 'Unsupported 2'
			}
			else{
				Loading.setFieldValue('custentity_sub_region', 12);//Undefined
				Loading.setFieldValue('custentity_field_sales_rep', ''); 
				subregion = 'Undefined'
			}
			Loading.setFieldValue('custentity_subregion_check', 'T');
			try{
				nlapiSubmitRecord(Loading);
			}
			catch(e){
				nlapiLogExecution('ERROR','Record Submission failed',e)
			}
		} nlapiLogExecution('DEBUG','Result number: '+j+' '+jobSearchresult.getText('custentity_sub_region'), 'recType = '+recType+', jobID = '+jobID+', jobPostcode = '+jobPostcode+' '+jobSubregion);
	}

	nlapiLogExecution('AUDIT','PB Edit', 'End');


}

function isValueInArray(arr, val) //the clever bit which searches the array
{
	inArray = false;
	for (var i = 0; i < arr.length; i++)
		if (val == arr[i])
			inArray = true;
	return inArray;
}