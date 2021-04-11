class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // BUILD THE QUERY
    // 1A)Filtering
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);
    console.log('--- build query ---');
    console.log(queryObj);

    // 1B) Advance filtering. We convert it into a string to do some extra filter,
    //then convert it back to an object again
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    console.log('---parsed query string ----');
    console.log(JSON.parse(queryStr));

    this.query = this.query.find(JSON.parse(queryStr));

    // return the entire object that access to the other methods.
    // By returning this, we can chain the methods.
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      console.log('--- sort By --- ');
      console.log(sortBy);
      this.query = this.query.sort(sortBy);
      // sort('price ratingsAverage'); if you want multiple sorting variables
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    // 3) Field limiting - select specific field names is called projecting
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
      // needs this format --> select('name duration price')
    } else {
      // excluding with -__v
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1; // convert it to a number, default number is 1
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit; // if we are at page three, our result are going to start at 21 to 30.
    //page=2&limit=10, 1-10 (page 1), 11-20 (page 2), so skip 10 to get to page 2
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
